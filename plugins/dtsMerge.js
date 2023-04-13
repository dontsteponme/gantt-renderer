
class DTSMergePlugin {
    constructor(path) {
        this.path = path;
    }
    apply(compiler) {
        compiler.hooks.afterCompile.tap('DTSMergePlugin', (compilation) => {
            require("child_process").execSync(`cat ${this.path}/*.d.ts | grep -v -E "import|export {};" >> bundle.d.ts`);
            require("child_process").execSync(`mv bundle.d.ts ${this.path}/bundle.d.ts`);
        });
    }
}

module.exports = DTSMergePlugin;
