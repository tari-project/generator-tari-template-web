import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // These are polyfills to get @metamask/provider to work in the browser.
    // https://gist.github.com/FbN/0e651105937c8000f10fefdf9ec9af3d
    alias: {
      stream: "rollup-plugin-node-polyfills/polyfills/stream",
      //events: "rollup-plugin-node-polyfills/polyfills/events",
      util: "rollup-plugin-node-polyfills/polyfills/util",
      buffer: "rollup-plugin-node-polyfills/polyfills/buffer-es6",
      process: "rollup-plugin-node-polyfills/polyfills/process-es6",
    },
    // This option is needed for local development
    // https://github.com/vitejs/vite/issues/15412
    preserveSymlinks: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: "globalThis",
      },
      // Enable esbuild polyfill plugins
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }),
        //NodeModulesPolyfillPlugin(),
      ],
    },
  },
});
