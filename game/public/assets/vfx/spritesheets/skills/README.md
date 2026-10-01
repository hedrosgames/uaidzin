# Sprite sheets VFX de skills

Atlas animados de apoio aos VFX das skills do UAIDZIN.

## Formato

- PNG com transparência.
- 512 × 512 px.
- Grid 4 × 4.
- 16 frames em ordem row-major.
- 128 × 128 px por frame.
- Frames pensados para formação, pico, deformação e dissipação.
- A identidade principal do VFX continua sendo 3D; estes atlases servem para matéria, wisps, trails, impactos, auras e partículas Quarks.

## Cobertura

Esta pasta contém as 95 skills de classe que não possuíam um sprite sheet PNG dedicado.

`tk_fis_fire_burst` já possui `visual/fire-burst-art/fire-burst-spritesheet.png` e não foi duplicado.

As quatro skills de Livros permanecem fora porque ainda são `bookStub` com magnitude 0 e não têm contrato de VFX de gameplay definido.
