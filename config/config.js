import fs from "fs";
import yaml from "js-yaml";

const CONFIG_FILE_PATH = "./config/configuration.yml";

let loadedConfig = null;

try {
  const fileContents = fs.readFileSync(CONFIG_FILE_PATH, "utf8");
  loadedConfig = yaml.load(fileContents);
} catch (e) {
  process.exit(1);
}

export default loadedConfig;
