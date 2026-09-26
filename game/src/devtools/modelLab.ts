import { ModelLab } from "./modelLab/ModelLab";

async function boot(): Promise<void> {
  const lab = new ModelLab();
  await lab.start();
}

void boot();
