const tokenizer = (rawCode = '') => {
  let current = 0;
  let tokens = [];
  while (rawCode.length > current) {
    let char = rawCode[current];
    // if is left parentheses
    if (char === '(') {
      tokens.push({
        type: 'parentheses',
        value: '('
      });
      current = current + 1;
      continue;
    }
    // if is right parenthese
    if (char === ')') {
      tokens.push({
        type: 'parentheses',
        value: ')'
      });
      current = current + 1;
      continue;
    }
    // deal with the space
    const WHITESPACE = /\s/;
    if (WHITESPACE.test(char)) {
      current = current + 1;
      continue;
    }
    // deal with the number
    const NUMBERS = /[0-9]/;
    if (NUMBERS.test(char)) {
      let value = '';
      while (NUMBERS.test(char)) {
        value = value + char;
        current = current + 1;
        char = rawCode[current];
      }
      tokens.push({
        type: 'number',
        value
      });
      continue;
    }
    // deal with string
    if (char === '"') {
      let value = '';
      current = current + 1;
      char = rawCode[current];
      while (char !== '"') {
        value = value + char;
        current = current + 1;
        char = rawCode[current];
      }
      current = current + 1;
      char = rawCode[current];
      tokens.push({
        type: 'string',
        value
      });
      continue;
    }
    // deal with the name
    const LETTERS = /[a-z]/i;
    if (LETTERS.test(char)) {
      let value = '';
      while (LETTERS.test(char)) {
        value = value + char;
        current = current + 1;
        char = rawCode[current];
      }
      tokens.push({
        type: 'name',
        value
      });
      continue;
    }
    // default
    throw new Error(`Invalid character: ${char}`);
  }
  return tokens;
};

const parser = (tokens = []) => {
  if (!Array.isArray(tokens)) {
    tokens = [];
  }
  let current = 0;
  const walk = () => {
    let token = tokens[current];
    if (token.type === 'number') {
      current = current + 1;
      return {
        type: 'NumberLiteral',
        value: token.value
      };
    }
    if (token.type === 'string') {
      current = current + 1;
      return {
        type: 'StringLiteral',
        value: token.value
      };
    }
    // the first node after '(' is a function
    if (token.type === 'parentheses' && token.value === '(') {
      current = current + 1;
      token = tokens[current];
      let node = {
        type: 'CallExpression',
        name: token.value,
        params: []
      };
      current = current + 1;
      token = tokens[current];
      while ((token.type !== 'parentheses') || (token.type === 'parentheses' && token.value !== ')')) {
        node.params.push(walk());
        token = tokens[current];
      }
      current = current + 1;
      return node;
    }

    throw new Error(token.type);
  };
  let ast = {
    type: 'Program',
    body: []
  };
  while (current < tokens.length) {
    ast.body.push(walk());
  }
  return ast;
};

const traverser = (ast, visitor) => {
  function traverseArray(array, parent) {
    array.forEach((child) => {
      traverseNode(child, parent);
    });
  }
  function traverseNode(node, parent) {
    let methods = visitor[node.type];
    if (methods && methods.enter) {
      methods.enter(node, parent);
    }
    switch (node.type) {
      case 'Program': {
        traverseArray(node.body, node);
        break;
      }
      case 'CallExpression': {
        traverseArray(node.params, node);
        break;
      }
      case 'NumberLiteral': {
        break;
      }
      case 'StringLiteral': {
        break;
      }
      default: {
        throw new TypeError(node.type);
      }
    }
    if (methods && methods.exit) {
      methods.exit(node, parent);
    }
  }
  traverseNode(ast, null);
};

const transformer = (ast) => {
  let newAst = {
    type: 'Program',
    body: []
  };
  ast._context = newAst.body;
  traverser(ast, {
    NumberLiteral: {
      enter: (node, parent) => {
        parent._context.push({
          type: 'NumberLiteral',
          value: node.value
        });
      }
    },
    StringLiteral: {
      enter: (node, parent) => {
        parent._context.push({
          type: 'StringLiteral',
          value: node.value
        });
      }
    },
    CallExpression: {
      enter: (node, parent) => {
        let expression = {
          type: 'CallExpression',
          callee: {
            type: 'Identifier',
            name: node.name
          },
          arguments: []
        };
        node._context = expression.arguments;
        if (parent.type !== 'CallExpression') {
          expression = {
            type: 'ExpressionStatement',
            expression: expression
          };
        }
        parent._context.push(expression);
      }
    }
  });
  return newAst;
};

const codeGenerator = (node) => {
  switch (node.type) {
    case 'Program': {
      return node.body.map(codeGenerator).join('\n');
    }
    case 'ExpressionStatement': {
      return codeGenerator(node.expression) + ';';
    }
    case 'CallExpression': {
      return codeGenerator(node.callee) + '(' + node.arguments.map(codeGenerator).join(', ') + ')';
    }
    case 'Identifier': {
      return node.name;
    }
    case 'NumberLiteral': {
      return node.value;
    }
    case 'StringLiteral': {
      return '"' + node.value + '"';
    }
    default: {
      throw new TypeError(node.type);
    }
  }
};

const compile = (rawCode) => {
  console.log('+---------------- Raw Code ------------------+');
  console.log(rawCode);
  let tokens = tokenizer(rawCode);
  console.log('+----------------- Tokens -------------------+');
  console.log(JSON.stringify(tokens, null, 2));
  let ast = parser(tokens);
  console.log('+------------------- Ast --------------------+');
  console.log(JSON.stringify(ast, null, 2));
  let newAst = transformer(ast);
  console.log('+----------------- New Ast ------------------+');
  console.log(JSON.stringify(newAst, null, 2));
  let result = codeGenerator(newAst);
  console.log('+-----------------  Result ------------------+');
  console.log(result);
  return result;
};

// compile('(add 2 (sub "x" 8))');
compile('(log "hello")');