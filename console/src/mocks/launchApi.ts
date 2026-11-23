export type LaunchOptions = {
  instanceTypes: string[];
  regions: string[];
  images: string[];
};

export type LaunchRequest = {
  instanceType: string;
  region: string;
  image: string;
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getLaunchOptions(): Promise<LaunchOptions> {
  await delay(300);
  return {
    instanceTypes: ['1x H100 (80 GB)', '1x A100 (40 GB)', '8x H100 (80 GB)'],
    regions: ['us-east-1', 'us-west-1', 'us-south-1'],
    images: ['Lambda Stack 24.04', 'Ubuntu 22.04'],
  };
}

export async function launchInstance(req: LaunchRequest): Promise<{ id: string }> {
  await delay(800);
  if (req.instanceType.startsWith('8x')) {
    throw new Error('Not enough capacity for 8x H100 in this region. Try another region.');
  }
  return { id: `inst-${Date.now()}` };
}