import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

declare module 'vitest' {
	interface TaskMeta {
		scenario?: string;
	}
}

type FinishedTest = { fullName: string; meta(): { scenario?: string }; result(): { state: string } };

type FinishedModule = { moduleId: string; children: { allTests(): Iterable<FinishedTest> } };

const RECORDS = 'tmp/tests/vitest.json';

const REACHED = ['passed', 'failed'];

export default class ScenarioRecords {
	private root = process.cwd();

	onInit(vitest: { config: { root: string } }) {
		this.root = vitest.config.root;
	}

	onTestRunEnd(modules: ReadonlyArray<FinishedModule>) {
		const records = modules.flatMap((module) => [...module.children.allTests()]
			.filter((test) => test.meta().scenario && REACHED.includes(test.result().state))
			.map((test) => ({ scenario: test.meta().scenario!, file: relative(this.root, module.moduleId), test: test.fullName })));
		const path = join(this.root, RECORDS);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, JSON.stringify(records));
	}
}
