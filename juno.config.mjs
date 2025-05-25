
import { defineConfig } from "@junobuild/config";

/** @type {import('@junobuild/config').JunoConfig} */
export default defineConfig({
  satellite: {
    ids: {
      development: "bkyz2-fmaaa-aaaaa-qaaaq-cai",
      production: 'poonz-yiaaa-aaaal-ar3qa-cai'
    },
    source: "out",
    predeploy: ["npm run build"],
  },
});
