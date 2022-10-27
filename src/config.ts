export default interface Config {
  appName: string;
  appVersion: string;
  servers: { url: URL; description: string }[];
}
