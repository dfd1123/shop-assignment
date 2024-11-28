import chokidar from 'chokidar';
import path from 'path';
import SvgComponentGenerator, { type SvgComponentGeneratorOption } from '../svgComponentGenerator';
import type { Compiler } from 'webpack';

type WebpackPluginOptions = SvgComponentGeneratorOption & {
	// Types
};

class WebpackSvgComponentPlugin {
	private svgCompGenertor: SvgComponentGenerator;
	private readonly svgFileDir: string;
	private readonly outputDir: string;
	private watcher?: chokidar.FSWatcher;

	constructor({ svgFileDir, outputDir, useSvgr, typescript, title, description, svgo }: WebpackPluginOptions) {
		this.svgFileDir = path.join(process.cwd(), svgFileDir);
		this.outputDir = outputDir ?? '';
		this.svgCompGenertor = new SvgComponentGenerator({
			svgFileDir, outputDir, useSvgr, typescript, title, description, svgo,
		});
	}

	async apply(compiler: Compiler) {
	if (!this.watcher) {
		this.watcher = chokidar.watch(this.svgFileDir, {    
			persistent: true, 
			ignored: [this.outputDir, /\/svg\/types\//], // outputDir 제외
			ignoreInitial: true
		});

		const generate = () => {
			if (process.env.NODE_ENV === 'development') {
				this.svgCompGenertor.generate();
			}
		};

		this.watcher.on('add', generate);
		this.watcher.on('unlink', generate);

		process.once('SIGINT', () => {
			if (this.watcher) {
				this.watcher.close();
			}

			process.exit(0);
		});
	}else{
		this.svgCompGenertor.generate();
	}
		
	}
}

export default WebpackSvgComponentPlugin;
