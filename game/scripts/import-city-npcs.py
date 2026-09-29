import bpy
import sys
from pathlib import Path

source = Path(sys.argv[sys.argv.index('--') + 1])
role = sys.argv[sys.argv.index('--') + 2]
files = {
    'merchant': 'Idle.fbx',
    'blacksmith': 'Breathing Idle.fbx',
    'sage': 'Wheelbarrow Idle.fbx',
}
destination = Path(__file__).resolve().parents[1] / 'public/models/npcs'
destination.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(source / files[role]))
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    for socket in ['Normal', 'Alpha']:
        for link in list(shader.inputs[socket].links):
            material.node_tree.links.remove(link)
    shader.inputs['Alpha'].default_value = 1
    shader.inputs['Specular IOR Level'].default_value = 0.35
    shader.inputs['Specular Tint'].default_value = (1, 1, 1, 1)
    shader.inputs['Roughness'].default_value = 0.88
    shader.inputs['Metallic'].default_value = 0
    material.name = 'CityNpc_' + role
for action in bpy.data.actions:
    action.name = role + '-idle'
bpy.ops.export_scene.gltf(
    filepath=str(destination / (role + '.glb')),
    export_format='GLB',
    export_animations=True,
)
