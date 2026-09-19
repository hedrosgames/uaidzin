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


def assign_texture(texture_path: Path, class_id: str):
    img = bpy.data.images.load(str(texture_path), check_existing=True)
    img.name = f"{class_id}_Diffuse"
    img.alpha_mode = "NONE"
    img.pack()
    for mat in bpy.data.materials:
        mat.name = f"{class_id}_Material"
        if hasattr(mat, "blend_method"):
            mat.blend_method = "OPAQUE"
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "DITHERED"
        if not mat.use_nodes:
            mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        tex = next((n for n in nodes if n.type == "TEX_IMAGE"), None)
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
        tex.name = f"{class_id}_Diffuse"


def rename_datablocks(class_id: str, clip_name: str):
    mesh_i = 0
    for obj in bpy.data.objects:
        lower = obj.name.lower()
        if obj.type == "ARMATURE":
            obj.name = f"{class_id}_Armature"
        elif obj.type == "MESH":
            mesh_i += 1
            obj.name = f"{class_id}_Body" if mesh_i == 1 else f"{class_id}_Mesh_{mesh_i}"
        elif "camera" in lower:
            obj.name = f"{class_id}_Camera"
        elif "light" in lower:
            obj.name = f"{class_id}_Light"
        else:
            obj.name = strip_tripo(obj.name, f"{class_id}_Object_{obj.type}")

    for arm in bpy.data.armatures:
        arm.name = f"{class_id}_Armature"
    for i, mesh in enumerate(bpy.data.meshes):
        mesh.name = f"{class_id}_BodyMesh" if i == 0 else f"{class_id}_MeshData_{i + 1}"
    for mat in bpy.data.materials:
        mat.name = f"{class_id}_Material"

    for action in bpy.data.actions:
        action.name = clip_name
    actions = list(bpy.data.actions)
    if actions:
        for obj in bpy.data.objects:
            if obj.type == "ARMATURE":
                if not obj.animation_data:
                    obj.animation_data_create()
                obj.animation_data.action = actions[0]


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


def export_glb(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=False,
        export_animations=True,
        export_materials="EXPORT",
        export_image_format="JPEG",
        export_jpeg_quality=85,
        export_apply=False,
    )


def main():
    args = argv_after_double_dash()
    if len(args) < 4:
        raise SystemExit("usage: blender -b -P clean-class-fbx.py -- <classId> <idle.fbx> <texture.jpg> <out.glb>")
    class_id, fbx, tex, out = args[0], Path(args[1]), Path(args[2]), Path(args[3])
    clear_scene()
    bpy.ops.import_scene.fbx(
        filepath=str(fbx),
        automatic_bone_orientation=False,
        ignore_leaf_bones=False,
        use_anim=True,
    )
    rename_datablocks(class_id, "idle")
    assign_texture(tex, class_id)
    fix_mesh_normals_and_weights()
    export_glb(out)
    print(f"OK {class_id} -> {out} ({out.stat().st_size/1024:.0f}KB)")


if __name__ == "__main__":
    main()
