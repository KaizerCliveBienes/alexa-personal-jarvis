class Context {
  setStrategy(strategy) {
    this.strategy = strategy;
  }

  executeStrategy(parameters) {
    return this.strategy.execute(parameters);
  }
}

export default Context;
