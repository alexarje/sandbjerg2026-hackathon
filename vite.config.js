import { defineConfig } from 'vite';

export default defineConfig({
	root: 'constellation',
	publicDir: '../final_clapping_section',
	base: './',
	build: { outDir: '../dist' },
});