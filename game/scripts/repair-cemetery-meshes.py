import bpy
import bmesh
import json
import sys
from pathlib import Path

arguments = sys.argv[sys.argv.index("--") + 1:]
source = Path(arguments[0]).resolve()
destination = Path(arguments[1]).resolve()
if source == destination:
    raise ValueError("A saída deve ser diferente dos originais")
destination.mkdir(parents=True, exist_ok=True)


def boundary_components(mesh):
    remaining = {edge for edge in mesh.edges if edge.is_boundary}
    components = []
    while remaining:
        pending = [remaining.pop()]
        component = []
        while pending:
            edge = pending.pop()
            component.append(edge)
            for vertex in edge.verts:
                for adjacent in vertex.link_edges:
                    if adjacent in remaining:
                        remaining.remove(adjacent)
                        pending.append(adjacent)
        components.append(component)
    return components


def repair_material(name, color):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    surface = material.node_tree.nodes.get("Principled BSDF")
    surface.inputs["Base Color"].default_value = (*color, 1)
    surface.inputs["Roughness"].default_value = 0.95
    return material


report = []
for name in ["muro-pedra", "lapide-arco", "arvore-seca", "mausoleu"]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source / f"{name}.glb"))
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    result = {"model": name, "filled": [], "preserved_openings": []}
    for obj in objects:
        mesh = bmesh.new()
        mesh.from_mesh(obj.data)
        bmesh.ops.remove_doubles(mesh, verts=list(mesh.verts), dist=0.000001)
        result["boundary_before"] = sum(edge.is_boundary for edge in mesh.edges)
        overlap_faces = set()
        for edge in mesh.edges:
            if len(edge.link_faces) > 2:
                overlap_faces.update(sorted(edge.link_faces, key=lambda face: face.calc_area())[:len(edge.link_faces) - 2])
        if overlap_faces:
            bmesh.ops.delete(mesh, geom=list(overlap_faces), context="FACES_ONLY")
        result["overlapping_faces_removed"] = len(overlap_faces)
        fill_material = repair_material(f"{name}-repaired-stone", (0.17, 0.185, 0.195) if name != "arvore-seca" else (0.07, 0.055, 0.04))
        obj.data.materials.append(fill_material)
        fill_slot = len(obj.data.materials) - 1
        uv_layer = mesh.loops.layers.uv.verify()
        for component in boundary_components(mesh):
            vertices = {vertex for edge in component for vertex in edge.verts}
            coordinates = [obj.matrix_world @ vertex.co for vertex in vertices]
            minimum = [min(point[axis] for point in coordinates) for axis in range(3)]
            maximum = [max(point[axis] for point in coordinates) for axis in range(3)]
            spans = [maximum[axis] - minimum[axis] for axis in range(3)]
            planar = min(spans) < 0.045
            architectural = name == "mausoleu" and len(component) > 8 and maximum[2] > 0.02
            if not planar or architectural:
                result["preserved_openings"].append({"edges": len(component), "min": minimum, "max": maximum})
                continue
            filled = bmesh.ops.holes_fill(mesh, edges=component, sides=0)["faces"]
            projection = sorted(range(3), key=lambda axis: spans[axis], reverse=True)[:2]
            for face in filled:
                face.material_index = fill_slot
                face.smooth = False
                for loop in face.loops:
                    point = obj.matrix_world @ loop.vert.co
                    loop[uv_layer].uv = (point[projection[0]] * 2, point[projection[1]] * 2)
            result["filled"].append({"edges": len(component), "faces": len(filled)})
        if name != "mausoleu":
            bmesh.ops.dissolve_degenerate(mesh, dist=0.0000001, edges=list(mesh.edges))
        bmesh.ops.recalc_face_normals(mesh, faces=list(mesh.faces))
        bmesh.ops.triangulate(mesh, faces=[face for face in mesh.faces if len(face.verts) > 3])
        result["boundary_after"] = sum(edge.is_boundary for edge in mesh.edges)
        result["nonmanifold_after"] = sum(len(edge.link_faces) > 2 for edge in mesh.edges)
        mesh.to_mesh(obj.data)
        mesh.free()
        result["validated_cleanup"] = obj.data.validate(verbose=False, clean_customdata=False)
        obj.data.update()
    if name in ["mausoleu", "muro-pedra"]:
        is_mausoleum = name == "mausoleu"
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.02, 0.33) if is_mausoleum else (0, 0.014, 0.24))
        lining = bpy.context.object
        lining.name = f"{name}-interior-masonry"
        lining.dimensions = (0.60, 0.48, 0.44) if is_mausoleum else (0.735, 0.025, 0.33)
        lining.data.materials.append(repair_material(f"{name}-interior-stone", (0.055, 0.06, 0.065) if is_mausoleum else (0.15, 0.16, 0.17)))
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        result["interior_lining"] = True
    bpy.ops.export_scene.gltf(filepath=str(destination / f"{name}.glb"), export_format="GLB", export_yup=True, export_normals=True, export_materials="EXPORT", export_image_format="AUTO")
    report.append(result)
    print("REPAIRED", name, result["boundary_before"], result["boundary_after"])
(destination / "mesh-repair.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
