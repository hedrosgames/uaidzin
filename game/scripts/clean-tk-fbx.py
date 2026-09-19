import bpy
import re
import sys
from pathlib import Path


def argv_after_double_dash():
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (
        bpy.data.meshes,
        bpy.data.armatures,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.actions,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for item in list(block):
            block.remove(item)


def strip_tripo(name: str, fallback: str) -> str:
    cleaned = re.sub(r"tripo[_\-][A-Za-z0-9_\-]+", "", name, flags=re.I)
    cleaned = re.sub(r"tripo", "", cleaned, flags=re.I)
    cleaned = re.sub(r"[_\-\.\s]+", "_", cleaned).strip("_")
    if not cleaned or cleaned.lower() in {"node", "mat", "mesh", "object"}:
        return fallback
    return cleaned


def prepare_texture_jpeg(src: Path, dst: Path, size: int = 1024, quality: int = 85) -> Path:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if src.resolve() != dst.resolve():
        img = bpy.data.images.load(str(src), check_existing=False)
    else:
        img = bpy.data.images.load(str(src), check_existing=True)
    img.name = "TK_Diffuse_Src"
    if img.size[0] != size or img.size[1] != size:
        img.scale(size, size)
    img.filepath_raw = str(dst)
    img.file_format = "JPEG"
    if hasattr(img, "save"):
        img.save()
    else:
        img.save_render(str(dst))
    print(f"TEX {src.name} -> {dst.name} {dst.stat().st_size/1024:.0f}KB {size}x{size}")
    return dst


def assign_texture(texture_path: Path):
    if not texture_path.is_file():
        raise FileNotFoundError(texture_path)
    img = bpy.data.images.load(str(texture_path), check_existing=True)
    img.name = "TK_Diffuse"
    img.alpha_mode = "NONE"
    img.pack()
    for mat in bpy.data.materials:
        mat.name = mat.name if mat.name.startswith("TK_") else "TK_Material"
        if hasattr(mat, "blend_method"):
            mat.blend_method = "OPAQUE"
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "DITHERED"
        if not mat.use_nodes:
            mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        tex = None
        for node in nodes:
            if node.type == "TEX_IMAGE":
                tex = node
                break
        if tex is None:
            tex = nodes.new("ShaderNodeTexImage")
        bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf:
            while bsdf.inputs["Base Color"].links:
                links.remove(bsdf.inputs["Base Color"].links[0])
            while bsdf.inputs["Alpha"].links:
                links.remove(bsdf.inputs["Alpha"].links[0])
            links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
            bsdf.inputs["Alpha"].default_value = 1.0
            if "Metallic" in bsdf.inputs:
                bsdf.inputs["Metallic"].default_value = 0.05
            if "Roughness" in bsdf.inputs:
                bsdf.inputs["Roughness"].default_value = 0.65
        tex.image = img
        tex.name = "TK_Diffuse"


def rename_datablocks(clip_name: str, is_base: bool):
    mesh_i = 0
    for obj in bpy.data.objects:
        lower = obj.name.lower()
        if obj.type == "ARMATURE":
            obj.name = "TK_Armature"
        elif obj.type == "MESH":
            mesh_i += 1
            obj.name = "TK_Body" if mesh_i == 1 else f"TK_Mesh_{mesh_i}"
        elif "camera" in lower:
            obj.name = "TK_Camera"
        elif "light" in lower:
            obj.name = "TK_Light"
        else:
            obj.name = strip_tripo(obj.name, f"TK_Object_{obj.type}")

    for arm in bpy.data.armatures:
        arm.name = "TK_Armature"

    for i, mesh in enumerate(bpy.data.meshes):
        mesh.name = "TK_BodyMesh" if i == 0 else f"TK_MeshData_{i + 1}"

    for i, mat in enumerate(bpy.data.materials):
        mat.name = "TK_Material" if i == 0 else f"TK_Material_{i + 1}"
        if mat.use_nodes and mat.node_tree:
            for node in mat.node_tree.nodes:
                if node.type == "BSDF_PRINCIPLED":
                    if "Metallic" in node.inputs:
                        node.inputs["Metallic"].default_value = 0.05
                    if "Roughness" in node.inputs:
                        node.inputs["Roughness"].default_value = 0.65
        if hasattr(mat, "metallic"):
            mat.metallic = 0.05
        if hasattr(mat, "roughness"):
            mat.roughness = 0.65

    actions = list(bpy.data.actions)
    for action in actions:
        action.name = clip_name

    if actions:
        for obj in bpy.data.objects:
            if obj.type == "ARMATURE":
                if not obj.animation_data:
                    obj.animation_data_create()
                obj.animation_data.action = actions[0]


def strip_to_armature_only():
    for obj in list(bpy.data.objects):
        if obj.type != "ARMATURE":
            bpy.data.objects.remove(obj, do_unlink=True)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            block.remove(item)


def import_fbx(path: Path):
    bpy.ops.import_scene.fbx(
        filepath=str(path),
        automatic_bone_orientation=False,
        ignore_leaf_bones=False,
        use_anim=True,
    )


def export_glb(path: Path, with_materials: bool):
    path.parent.mkdir(parents=True, exist_ok=True)
    kwargs = dict(
        filepath=str(path),
        export_format="GLB",
        use_selection=False,
        export_animations=True,
        export_apply=False,
    )
    if with_materials:
        kwargs["export_materials"] = "EXPORT"
        kwargs["export_image_format"] = "JPEG"
        kwargs["export_jpeg_quality"] = 85
    else:
        kwargs["export_materials"] = "NONE"
    bpy.ops.export_scene.gltf(**kwargs)


def fix_mesh_normals_and_weights():
    for obj in list(bpy.data.objects):
        if obj.type != "MESH":
            continue
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode="OBJECT")
        bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
        obj.select_set(False)


def process_base(src: Path, dst: Path, clip_name: str, texture_path: Path):
    clear_scene()
    import_fbx(src)
    rename_datablocks(clip_name, True)
    assign_texture(texture_path)
    fix_mesh_normals_and_weights()
    export_glb(dst, with_materials=True)
    print(f"OK BASE {src.name} -> {dst} ({dst.stat().st_size/1024:.0f}KB)")


def process_anim(src: Path, dst: Path, clip_name: str):
    clear_scene()
    import_fbx(src)
    rename_datablocks(clip_name, False)
    strip_to_armature_only()
    export_glb(dst, with_materials=False)
    print(f"OK ANIM {src.name} -> {dst} ({dst.stat().st_size/1024:.0f}KB)")


def main():
    args = argv_after_double_dash()
    if len(args) < 3:
        raise SystemExit("usage: blender -b -P clean-tk-fbx.py -- <workdir> <outdir> <texture.jpg|png>")
    workdir = Path(args[0])
    outdir = Path(args[1])
    texture_src = Path(args[2])
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / "anims").mkdir(parents=True, exist_ok=True)

    texture_jpeg = outdir / "texture.jpg"
    if texture_src.suffix.lower() in {".jpg", ".jpeg"} and texture_src.is_file():
        if texture_src.resolve() != texture_jpeg.resolve():
            texture_jpeg.write_bytes(texture_src.read_bytes())
    else:
        prepare_texture_jpeg(texture_src, texture_jpeg, size=1024, quality=85)

    process_base(workdir / "src_idle.fbx", outdir / "TK.glb", "idle", texture_jpeg)

    anim_jobs = [
        ("src_run.fbx", "anims/run.glb", "run"),
        ("src_attack.fbx", "anims/attack.glb", "attack"),
        ("src_cast.fbx", "anims/cast.glb", "cast"),
        ("src_hit_gut.fbx", "anims/hit_gut.glb", "hit_gut"),
        ("src_hit_right.fbx", "anims/hit_right.glb", "hit_right"),
        ("src_death.fbx", "anims/death.glb", "death"),
    ]
    for src_name, rel_out, clip in anim_jobs:
        process_anim(workdir / src_name, outdir / rel_out, clip)

    old_png = outdir / "texture.png"
    if old_png.is_file():
        old_png.unlink()
        print(f"REMOVED {old_png.name}")


if __name__ == "__main__":
    main()
