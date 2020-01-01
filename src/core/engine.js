class Engine {
    constructor() {
        console.log(window.devicePixelRatio)
        console.log(document.querySelector('body').clientWidth)
        this.memorySize = Math.floor(document.querySelector('body').clientWidth / 46) * 5;
        this.reset();
    }

    reset() {
        this.state = [];
        for (let i = 0; i < this.memorySize; i++) {
            this.state.push({
                isAllocated: false,
                isReserved: false,
            });
        }
        this.state[0].isReserved = true;

                // key: variable identifier
        // value: {nodeType: 'variable', type: 'someType', value: someValue}
        this.variables = {
            help: {
                nodeType: 'variable',
                type: 'function',
                value: () => {
                    return '\n- Use C-style syntax\n' +
                            '- Variable declaration and assignment is supported\n' + 
                            '- Intelligent suggestions are provided. You can use tab to insert a suggestion.\n' + 
                            '- The following functions are available:\n' + 
                            '  - malloc(int)\n' + 
                            '  - free(int)\n' + 
                            '  - coalesce()\n' + 
                            '  - reset()\n' + 
                            '  - clearConsole()\n' + 
                            '  - setMemorySize(int)';
                }
            },
            reset: {
                nodeType: 'variable',
                type: 'function',
                value: () => {
                    this.reset();
                    return {
                        nodeType: 'variable',
                        actionHadSideEffect: true,
                        type: 'int',
                        value: undefined,
                    }
                }
            },
            clearConsole: {
                nodeType: 'variable',
                type: 'function',
                value: () => {
                    return {
                        nodeType: 'ui-action',
                        action: 'clearConsole',
                    }
                }
            },
            malloc: {
                nodeType: 'variable',
                type: 'function',
                value: (argument) => {
                    let result = this.malloc(argument);
                    return {
                        nodeType: 'variable',
                        actionHadSideEffect: true,
                        type: 'int',
                        value: result,
                    }
                }
            },
            free: {
                nodeType: 'variable',
                type: 'function',
                value: (argument) => {
                    this.free(argument);
                    return {
                        nodeType: 'variable',
                        actionHadSideEffect: true,
                        type: 'int',
                        value: undefined,
                    }
                }
            },
            setMemorySize: {
                nodeType: 'variable',
                type: 'function',
                value: (argument) => {
                    this.setMemorySize(argument);
                    return {
                        nodeType: 'variable',
                        actionHadSideEffect: true,
                        type: 'int',
                        value: undefined,
                    }
                }
            },
            coalesce: {
                nodeType: 'variable',
                type: 'function',
                value: (argument) => {
                    this.coalesce();
                    return {
                        nodeType: 'variable',
                        actionHadSideEffect: true,
                        type: 'int',
                        value: undefined,
                    }
                }
            },
        };
    }

    getIdentifiers() {
        return Object.keys(this.variables);
    }

    getFunctions() {
        return Object.keys(this.variables)
                    .filter(elem => this.variables[elem].type === 'function');
    }



    malloc(size) {
        if (typeof size === 'string') {
            size = parseInt(size);
        }

        if (size === 0) {
            throw new Error('Runtime exception in malloc():\n  Size cannot be zero.');
        }
        else if (size < 0) {
            throw new Error('Runtime exception in malloc():\n  Size cannot be negative.');
        }

        let startIndex;
        let freeCells = 0;
        for (let i = 0; i < this.state.length; i++) {
            if (this.state[i].isAllocated || this.state[i].isReserved) {
                freeCells = 0;
            }
            else {
                freeCells++;
                if (freeCells === size) {
                    startIndex = i - freeCells;
                    break;
                }
            }
        }
        
        if (startIndex === undefined) {
            throw new Error('Runtime exception in malloc(): Out of memory.');
        }

        for (let i = startIndex; i <= startIndex + size; i++) {
            this.state[i].isAllocated = true;
        }

        this.state[startIndex].isReserved = true;
        let oldCellValue = this.state[startIndex].cellValue;
        this.state[startIndex].cellValue = startIndex + size + 1;

        if (this.state[startIndex + size + 1] !== undefined && !this.state[startIndex + size + 1].isReserved) {
            this.state[startIndex + size + 1].isReserved = true;
            this.state[startIndex + size + 1].cellValue = oldCellValue;
        }

        return startIndex + 1;
    }

    free(ptr) {
        if (this.state[ptr - 1] === undefined) {
            throw new Error('Runtime exception in free():\n  Memory pointer is out of bounds.');
        }
        else if (!this.state[ptr - 1].isReserved || !this.state[ptr - 1].isAllocated) {
            throw new Error('Runtime exception in free():\n  Memory pointer does not point to the start of an allocated chunk.');
        }
        
        this.state[ptr - 1].isAllocated = false;

        for (let i = ptr; i < this.state.length; i++) {
            if (this.state[i].isReserved) {
                break;
            }
            this.state[i].isAllocated = false;
        }
    }

    setMemorySize(size) {
        if (size < 1) {
            throw new Error('Runtime exception in setMemorySize(): Memory size must be at least 1.');
        }

        if (size === this.memorySize) {
            return;
        }
        else if (size > this.memorySize) {
            for (let i = 0; i < size - this.memorySize; i++) {
                if (i === 0 && this.state[this.memorySize - 1].isAllocated) {
                    this.state.push({
                        isAllocated: false,
                        isReserved: true,
                    });
                }
                else {
                    this.state.push({
                        isAllocated: false,
                        isReserved: false,
                    });
                }
            }
        }
        else {
            this.state = this.state.slice(0, size);

            for (let i = this.state.size - 1; i >= 0; i--) {
                if (this.state[i].isReserved) {
                    this.state[i].next = undefined;
                    break;
                }
            }
        }

        this.memorySize = size;
    }

    coalesce() {
        let ptr = 0;
        while (true) {
            if (ptr >= this.state.length) {
                break;
            }

            if (this.state[ptr].cellValue === undefined ||
                this.state[ptr].cellValue < 0 ||
                this.state[ptr].cellValue >= this.state.length) {
                break;
            }

            if (!this.state[ptr].isAllocated && !this.state[this.state[ptr].cellValue].isAllocated) {
                let cellValuePtr = this.state[ptr].cellValue;
                this.state[ptr].cellValue = this.state[cellValuePtr].cellValue;
                this.state[cellValuePtr].cellValue = undefined;
                this.state[cellValuePtr].isReserved = false;
                continue;
            }

            ptr = this.state[ptr].cellValue;
        }
    }

    // Groups the state into blocks to help
    // with UI structuring
    getState() {
        let state = {};
        state.blocks = [];

        let block;
        let createNewBlock = true;
        for (let i = 0; i < this.state.length; i++) {
            if (createNewBlock) {
                if (block !== undefined) {
                    state.blocks.push(block);
                }

                block = {cells: []};
                block.isAllocated = this.state[i].isAllocated;
            }

            block.cells.push(this.state[i]);

            createNewBlock = (i + 1 < this.state.length) && (this.state[i + 1].isReserved);
        }
        
        state.blocks.push(block);

        return state;
    }



    // Recursively evaluates a node in the AST
    // and returns the result, along with
    // performing any side effects.
    evaluate(node) {
        if (Array.isArray(node)) {
            if (node.length === 0) {
                throw new Error('Parsing error: Command is incomplete.\n  Did you forget a \')\'?');
            }
            return (this.evaluate(node[0]))
        }

        switch(node.nodeType) {
            case 'literal': {
                return this.evaluate(node.literal);
            }
            case 'number': {
                return node.number;
            }
            case 'statement': {
                return this.evaluate(node.statement);
            }
            case 'identifier': {
                if (!this.variables.hasOwnProperty(node.identifier)) {
                    throw new Error(`Reference error: '${node.identifier}' is not defined.`);
                }
                return this.variables[node.identifier];
            }
            case 'whiteSpace': {
                return undefined;
            }
            case 'assignment': {
                let identifier;
                if (node.left.nodeType === 'identifier') {
                    identifier = node.left.identifier;
                    if (this.variables[identifier] === undefined) {
                        throw new Error(`Reference error: '${identifier}' is not defined.`)
                    }
                }
                else if (node.left.nodeType === 'declaration') {
                    identifier = this.evaluate(node.left).identifier;
                }

                let value = this.evaluate(node.right);

                if (value.nodeType === 'variable') {
                    this.variables[identifier].type = value.type;
                    this.variables[identifier].value = value.value;
                }
                else {
                    this.variables[identifier].type = 'int';
                    this.variables[identifier].value = value;
                }

                return value;
            }
            case 'functionCall': {
                let func = this.evaluate(node.functionName);
                if (func.type !== 'function') {
                    throw new Error(`Type error: '${node.functionName.identifier}' is not a function.`);
                }

                let arg = node.argument ? this.evaluate(node.argument) : undefined;

                return func.value(arg !== undefined && arg.nodeType === 'variable' ? arg.value : arg);
            }
            case 'declaration': {
                let type = this.evaluate(node.type);
                let identifier = node.identifier.identifier;
                if (this.variables[identifier] !== undefined) {
                    throw new Error(`Syntax error: Identifier '${identifier}' has already been declared.`);
                }
                this.variables[identifier] = {
                    nodeType: 'variable',
                    type: type,
                    value: undefined,
                }
                return node.identifier;
            }
            case 'type': {
                return node.type;
            }
            default:
        }
    }
}

export default Engine;