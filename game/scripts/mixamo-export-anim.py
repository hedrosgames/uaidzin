import bpy
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


def import_fbx(path: Path):
    bpy.ops.import_scene.fbx(
        filepath=str(path),
        automatic_bone_orientation=False,
        ignore_leaf_bones=False,
        use_anim=True,
    )


def strip_to_armature_only():
    for obj in list(bpy.data.objects):
        if obj.type != "ARMATURE":
            bpy.data.objects.remove(obj, do_unlink=True)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            block.remove(item)


def export_glb(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=False,
        export_animations=True,
        export_materials="NONE",
        export_apply=False,
    )


def main():
    args = argv_after_double_dash()
    if len(args) < 3:
        raise SystemExit("usage: blender -b -P mixamo-export-anim.py -- <src.fbx> <out.glb> <clipName>")
    src, out, clip = Path(args[0]), Path(args[1]), args[2]
    clear_scene()
    import_fbx(src)
    for action in bpy.data.actions:
        action.name = clip
    actions = list(bpy.data.actions)
    if actions:
        for obj in bpy.data.objects:
            if obj.type == "ARMATURE":
                if not obj.animation_data:
                    obj.animation_data_create()
                obj.animation_data.action = actions[0]
    strip_to_armature_only()
    export_glb(out)
    print(f"OK {src.name} -> {out} ({out.stat().st_size/1024:.0f}KB)")


if __name__ == "__main__":
    main()
