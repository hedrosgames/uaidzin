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


def main():
    args = argv_after_double_dash()
    if len(args) < 3:
        raise SystemExit("usage: blender -b -P mixamo-retarget-idle.py -- <base.glb> <idle.fbx> <out.glb>")
    base_glb, idle_fbx, out_glb = Path(args[0]), Path(args[1]), Path(args[2])
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(base_glb))
    base_arm = None
    for obj in bpy.data.objects:
        if obj.type == "ARMATURE":
            base_arm = obj
            break
    if not base_arm:
        raise SystemExit("base armature missing")
    bpy.ops.import_scene.fbx(
        filepath=str(idle_fbx),
        automatic_bone_orientation=False,
        ignore_leaf_bones=False,
        use_anim=True,
    )
    donor_arm = None
    for obj in list(bpy.data.objects):
        if obj.type == "ARMATURE" and obj != base_arm:
            donor_arm = obj
            break
    action = None
    if donor_arm and donor_arm.animation_data and donor_arm.animation_data.action:
        action = donor_arm.animation_data.action
    if not action and bpy.data.actions:
        action = bpy.data.actions[0]
    if not action:
        raise SystemExit("idle action missing")
    action.name = "idle"
    for obj in list(bpy.data.objects):
        if obj.type != "ARMATURE" or obj == base_arm:
            continue
        bpy.data.objects.remove(obj, do_unlink=True)
    for obj in list(bpy.data.objects):
        if obj.type == "MESH" and obj.parent != base_arm:
            bpy.data.objects.remove(obj, do_unlink=True)
    if not base_arm.animation_data:
        base_arm.animation_data_create()
    base_arm.animation_data.action = action
    out_glb.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(out_glb),
        export_format="GLB",
        use_selection=False,
        export_animations=True,
        export_materials="EXPORT",
        export_image_format="JPEG",
        export_jpeg_quality=85,
        export_apply=False,
    )
    print(f"OK idle -> {out_glb} ({out_glb.stat().st_size/1024:.0f}KB)")


if __name__ == "__main__":
    main()
