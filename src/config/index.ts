import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface Config {
  timeout: number;
  model: string;
  ripgrep: boolean;
  format: boolean;
  watchPatterns?: string[];
  [key: string]: any;
}

const DEFAULT_CONFIG: Config = {
  timeout: 300,
  model: 'gemini-2.5-pro',
  ripgrep: true,
  format: true,
  watchPatterns: ['*.ts', '*.tsx', '*.js', '*.jsx']
};

export async function loadConfig(): Promise<Config> {
  const configs: Partial<Config>[] = [];

  // 1. Load global config
  const globalConfigPath = path.join(os.homedir(), '.claude-gemini', 'config.json');
  if (await fs.pathExists(globalConfigPath)) {
    configs.push(await fs.readJson(globalConfigPath));
  }

  // 2. Load project config
  const projectConfigPath = path.join(process.cwd(), '.claude-gemini', 'config.json');
  if (await fs.pathExists(projectConfigPath)) {
    configs.push(await fs.readJson(projectConfigPath));
  }

  // 3. Load .claude-gemini.json in project root
  const rootConfigPath = path.join(process.cwd(), '.claude-gemini.json');
  if (await fs.pathExists(rootConfigPath)) {
    configs.push(await fs.readJson(rootConfigPath));
  }

  // Merge configs (later ones override earlier ones)
  const merged = configs.reduce((acc, config) => ({ ...acc, ...config }), {} as Partial<Config>);
  return { ...DEFAULT_CONFIG, ...merged };
}

export async function saveConfig(config: Partial<Config>, global = false): Promise<void> {
  const configPath = global
    ? path.join(os.homedir(), '.claude-gemini', 'config.json')
    : path.join(process.cwd(), '.claude-gemini', 'config.json');

  await fs.ensureDir(path.dirname(configPath));
  
  const existing = await fs.pathExists(configPath) 
    ? await fs.readJson(configPath)
    : {};

  await fs.writeJson(configPath, { ...existing, ...config }, { spaces: 2 });
}