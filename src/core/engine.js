class Engine {
    constructor() {
        this.memorySize = Math.floor(document.querySelector('body').clientWidth / 46) * 3;
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
                    return '\n- Commands use C-style syntax.\n' +
                            '- Variable declaration and assignment is supported.\n' + 
                            '- Intelligent live suggestions are provided. You can use tab to insert a suggestion.\n' + 
                            '- The following functions are available:\n' + 
                            '  - malloc(int)\n' + 
                            '  - free(int)\n' + 
                            '  - freeAll()\n' + 
                            '  - coalesce()\n' + 
                            '  - setMemorySize(int)\n' +
                            '  - sizeof(any)\n' + 
                            '  - setAllocationMethod("best fit" | "worst fit" | "first fit")\n' + 
                            '  - getAllocationMethod()\n' + 
                            '  - reset()\n' + 
                            '  - clearConsole()';
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
            freeAll: {
                nodeType: 'variable',
                type: 'function',
                value: () => {
                    let i = 0;
                    while(i !== undefined) {
                        if (this.state[i].isAllocated) {
                            this.free(i + 1);
                        }
                        i = this.state[i].cellValue;
                    }
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
            sizeof: {
                nodeType: 'variable',
                type: 'function',
                value: (argument) => {
                    if (argument === undefined) {
                        throw new Error('Syntax error ("sizeof()"):\n  Expected 1 argument, got 0.');
                    }
                    let type = argument.type;
                    if (type === undefined) {
                        throw new Error('This is a bug lol');
                    }

                    let val;
                    switch(type) {
                        case 'int':
                            val = 1;
                            break;
                        case 'char':
                            val = 1;
                            break;
                        case 'double':
                            val = 2;
                            break;
                        default:
                            val = -1;
                            break;
                    }

                    return {
                        nodeType: 'variable',
                        actionHadSideEffect: false,
                        type: 'string',
                        value: val,
                    }
                }
            },
            setAllocationMethod: {
                nodeType: 'variable',
                type: 'function',
                value: (method) => {
                    if (method === 'best fit' || method === 'worst fit' || method === 'first fit') {
                        this.variables.currentAllocationMethod = {
                            nodeType: 'variable',
                            type: 'string',
                            value: method
                        }
                        return {
                            nodeType: 'variable',
                            actionHadSideEffect: false
                        };
                    }
                    else {
                        throw new Error('Runtime exception in setAllocationMethod(): Method is invalid.\n  Valid methods are "best fit", "worst fit", and "first fit".');
                    }
                }
            },
            getAllocationMethod: {
                nodeType: 'variable',
                type: 'function',
                value: () => {
                    return this.variables.currentAllocationMethod;
                }
            },
            currentAllocationMethod: {
                nodeType: 'variable',
                type: 'string',
                value: 'first fit'
            },
            int: {
                nodeType: 'type',
                type: 'int'
            },
            double: {
                nodeType: 'type',
                type: 'double'
            },
            string: {
                nodeType: 'type',
                type: 'string'
            },
            char: {
                nodeType: 'type',
                type: 'char'
            }
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

        switch(this.variables.currentAllocationMethod.value) {
            case 'first fit': {
                let i = 0;
                while (i !== undefined) {
                    if (!this.state[i].isAllocated) {
                        let cellVal = (this.state[i].cellValue ? this.state[i].cellValue : this.state.length);
                        let currentSize = cellVal - i - 1;
                        if (currentSize >= size) {
                            startIndex = i;
                            break;
                        }
                    }
                    i = this.state[i].cellValue;
                }
                break;
            }
            case 'best fit': {
                let bestSize = this.state.length - 1; // accounts for reserved word
                let bestStart = 0;
                let i = 0;
                while (i !== undefined) {
                    let cellVal = (this.state[i].cellValue ? this.state[i].cellValue : this.state.length);
                    if (!this.state[i].isAllocated && cellVal - i - 1 < bestSize) {
                        bestSize = cellVal - i - 1;
                        bestStart = i;
                    }
                    i = this.state[i].cellValue;
                }
                if (size <= bestSize) {
                    startIndex = bestStart;
                }
                break;
            }
            case 'worst fit': {
                let bestSize = 0;
                let bestStart = 0;
                let i = 0;
                while (i !== undefined) {
                    let cellVal = (this.state[i].cellValue ? this.state[i].cellValue : this.state.length);
                    if (!this.state[i].isAllocated && cellVal - i - 1 > bestSize) {
                        bestSize = cellVal - i - 1;
                        bestStart = i;
                    }
                    i = this.state[i].cellValue;
                }
                if (size <= bestSize) {
                    startIndex = bestStart;
                }
                break;
            }
            default:
                throw new Error('Runtime exception in malloc():\n  Allocation method is invalid.\n  Hint: Don\t set currentAllocationMethod directly; instead, use setAllocationMethod().')
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
        if (this.state[startIndex].cellValue >= this.state.length) {
            this.state[startIndex].cellValue = undefined;
        }

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
        if (node === null || node === undefined) {
            return {
                nodeType: 'variable',
                actionHadSideEffect: false,
                value: undefined
            };
        }

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
            case 'int': {
                return node.int;
            }
            case 'char': {
                return node.char;
            }
            case 'double': {
                return node.double;
            }
            case 'string': {
                return node.string;
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

                let value;

                if (node.right.nodeType === 'literal') {
                    value = this.evaluate(node.right);

                    let type = node.right.literal.nodeType;

                    value = {
                        nodeType: 'variable',
                        type: type,
                        value: value
                    }
                }
                else if (value.nodeType === 'variable') {
                    value = node.right;
                }
                else {
                    value = this.evaluate(node.right);
                }

                if (value.nodeType === 'variable') {
                    if (this.variables[identifier].type !== value.type) {
                        if (this.variables[identifier].type === 'int' && value.type === 'double') {
                            this.variables[identifier].value = parseInt(value.value);
                        }
                        else if (this.variables[identifier].type === 'double' && value.type === 'int') {
                            this.variables[identifier].value = value.value;
                        }
                        else {
                            throw new Error(`Syntax error: Type mismatch between ${this.variables[identifier].type} and ${value.type}.`)
                        }
                    }
                    this.variables[identifier].value = value.value;
                }
                else {
                    this.variables[identifier].type = 'int';  // um,
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
                return this.evaluate(node.declaration);
            }
            case 'singleDeclaration': {
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
            case 'arrayDeclaration': {
                throw new Error('Array logic is not supported yet.');
            }
            case 'cast': {
                throw new Error('Casting and type checking is not supported yet.');
            }
            case 'parenthesis': {
                return this.evaluate(node.statement);
            }
            case 'operator': {
                let left;
                let right;

                if (node.left.nodeType === 'literal') {
                    left = {
                        nodeType: 'variable',
                        type: node.left.literal.nodeType,
                        value: this.evaluate(node.left)
                    }
                }
                else {
                    left = this.evaluate(node.left);
                }

                if (node.right.nodeType === 'literal') {
                    right = {
                        nodeType: 'variable',
                        type: node.right.literal.nodeType,
                        value: this.evaluate(node.right)
                    }
                }
                else {
                    right = this.evaluate(node.right);
                }

                if (left.value !== undefined) {
                    let type = left.type;
                    left = left.value;
                    if (type === 'double') {
                        left = parseFloat(left);
                    }
                    else if (type === 'int') {
                        left = parseInt(left);
                    }
                }

                if (right.value !== undefined) {
                    let type = right.type;
                    right = right.value;
                    if (type === 'double') {
                        right = parseFloat(right);
                    }
                    else if (type === 'int') {
                        right = parseInt(right);
                    }
                }

                if (typeof left !== typeof right) {
                    throw new Error('Syntax error: Type mismatch.');
                }

                let result;

                switch(node.operator) {
                    case '+':
                        result = left + right;
                        break;
                    case '-':
                        result = left - right;
                        break;
                    case '*':
                        result = left * right;
                        break;
                    case '/':
                        result = left / right;
                        break;
                }

                let type = typeof result;

                if (type === 'number') {
                    if (result % 1 === 0) {
                        type = 'double';
                    }
                    else {
                        type = 'int';
                    }
                }

                return {
                    nodeType: 'variable',
                    type: type,
                    value: result
                }
            }
            case 'type': {
                return node.type;
            }
            case 'arrayIndex': {
                throw new Error('Array logic is not supported yet.');
            }
            default: {
                throw new Error('AST evaluator: Node type was not recognized.\n  This is a bug.')
            }
        }
    }
}

export default Engine;