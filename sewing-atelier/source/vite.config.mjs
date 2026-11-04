import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({base:'./',plugins:[react()],build:{outDir:'dist',target:'es2020',rollupOptions:{output:{manualChunks(id){if(id.includes('/react-dom/'))return 'react-dom';if(id.includes('/react/')||id.includes('/scheduler/'))return 'react';if(id.includes('/lucide-react/'))return 'icons';}}}}});
