"use strict";
const Generator = require("yeoman-generator");
const chalk = require("chalk");
const yosay = require("yosay");

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.argument("name", { type: String, required: true });
    this.argument("templateDefFile", { type: String, required: true });
    this.argument("walletJrpcClientDep", { type: String, required: true });
  }

  async prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Welcome to the exceptional ${chalk.red(
          "generator-tari-template-web"
        )} generator!`
      )
    );

    if (this.fs.exists(this.options.templateDefFile)) {
      this.props = this.props || {};
      this.props.templateDef = JSON.parse(
        await this.fs.read(this.options.templateDefFile)
      );
    }
  }

  writing() {
    this.fs.copyTpl(this.templatePath("**/*"), this.destinationRoot(), {
      ...this.options,
      ...this.props
    });
  }

  install() {
    this.installDependencies({ npm: true, bower: false, yarn: false });
  }
};
