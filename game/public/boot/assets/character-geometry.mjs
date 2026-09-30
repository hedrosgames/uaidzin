const TK_LOOSE_INDICES = [12194, 12195, 12491, 12194, 12491, 12490];
const TK_LOOSE_OFFSET = 30873;

export function repairCharacterGeometry(model, classId) {
  if (classId !== "TK") return;
  model.traverse((mesh) => {
    if (!mesh.isMesh || mesh.geometry.userData.tkLooseFragmentRemoved) return;
    const source = mesh.geometry;
    const index = source.index;
    const position = source.attributes.position;
    if (!index || !position || index.count < TK_LOOSE_OFFSET + 6) return;
    if (!TK_LOOSE_INDICES.every((vertex, offset) => index.getX(TK_LOOSE_OFFSET + offset) === vertex)) return;
    const signatureMatches = TK_LOOSE_INDICES.every((vertex) =>
      Math.abs(position.getY(vertex) - 0.041748114) < 0.000001
      && position.getX(vertex) > 0.12475 && position.getX(vertex) < 0.15455
      && position.getZ(vertex) > 0.81493 && position.getZ(vertex) < 0.81593,
    );
    if (!signatureMatches) return;
    const geometry = source.clone();
    const retained = Array.from(index.array);
    retained.splice(TK_LOOSE_OFFSET, 6);
    geometry.setIndex(retained);
    geometry.userData.tkLooseFragmentRemoved = true;
    mesh.geometry = geometry;
    source.dispose();
  });
}
