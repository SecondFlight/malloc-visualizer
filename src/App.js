import React, { useState } from 'react';
import './App.css';
import CommandArea from './components/CommandArea.js';
import MemoryVisualizer from './components/MemoryVisualizer.js';
import nearley from 'nearley';
import Engine from './core/engine.js';

function App(props) {
    const [commandHeight, setCommandHeight] = useState(300);
    const [isDragActive, setIsDragActive] = useState(false);
    const [commandHistory, setCommandHistory] = useState([]);
    const [uiState, setUiState] = useState([]);
    
    if (window.engine === undefined) {
        window.engine = new Engine();
        setUiState(window.engine.getState());
    }
    
    let handleMouseMove = (event) => {
        if (!isDragActive) {
            return;
        }

        let pageHeight = document.querySelector('body').clientHeight;

        let newHeight = pageHeight - event.pageY;
        if (newHeight < 250) {
            newHeight = 250;
        }
        else if (newHeight > pageHeight * 4 / 7) {
            newHeight = pageHeight * 4 / 7;
        }
        newHeight -= 3; // Account for spacer height
        setCommandHeight(newHeight);
    }

    return (
        <div className="App"
            style={{
                cursor: isDragActive ? 'ns-resize' : undefined,
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={() => {
                setIsDragActive(false);
            }}
        >
            <div className="mainContent"
                style={{flex: 1}}>
                    <MemoryVisualizer memState={uiState} />
            </div>
            <div className="spacer"
                onMouseDown={() => {setIsDragActive(true)}}
                style={{
                    height: 6,
                }} />
            <CommandArea
                height={ commandHeight }
                commandHistory={commandHistory}
                getPrediction={text => {
                    let spaceSplit = text.split(' ');
                    let spaceLastWord = spaceSplit[spaceSplit.length - 1];
            
                    let parenthesisSplit = text.split('(');
                    let parenthesisLastWord = parenthesisSplit[parenthesisSplit.length - 1];
            
                    if (spaceLastWord === '' || parenthesisLastWord === '') {
                        return text;
                    }
                    
                    const zeroArgumentFunctions = ['help', 'reset', 'clearConsole', 'coalesce'];
                    const oneArgumentFunctions = ['malloc', 'free', 'setMemorySize'];
            
                    let identifiers = window.engine.getIdentifiers();
                    let functions = window.engine.getFunctions();

                    let predictions = oneArgumentFunctions
                        .map(elem => elem + '(')
                        .concat(
                            zeroArgumentFunctions.map(elem => elem + '()'))
                        .concat(
                            identifiers.filter(identifier => !functions.includes(identifier)));
            
                    predictions = predictions.sort();
                    
                    for (let prediction of predictions) {
                        if (prediction.startsWith(spaceLastWord)) {
                            spaceSplit[spaceSplit.length - 1] = prediction;
                            return spaceSplit.join(' ');
                        }
                        if (prediction.startsWith(parenthesisLastWord)) {
                            parenthesisSplit[parenthesisSplit.length - 1] = prediction;
                            return parenthesisSplit.join('(');
                        }
                    }
            
                    return text;
                }}
                onCommand={command => {
                    let historyToAdd = [];

                    historyToAdd.push({
                        style: 'command',
                        text: command
                    })

                    /*
                        Main -> statement | statement _ ";"

                        statement -> literal | identifier | assignment | functionCall | declaration | _ {%
                            function(data) {
                                return {
                                    nodeType: 'statement',
                                    statement: data[0]
                                }
                            }
                        %}

                        number -> [0-9]:+ {%
                            function(data) {
                                return {
                                    nodeType: 'number',
                                    number: data[0].join().replace(/,/g, '')
                                }
                            }
                        %}

                        literal -> number {%
                            function(data) {
                                return {
                                    nodeType: 'literal',
                                    literal: data[0]
                                }
                            }
                        %}

                        identifier -> [a-zA-Z_] [a-zA-Z0-9_]:* {%
                            function(data) {
                                return {
                                    nodeType: 'identifier',
                                    identifier: (data[0] + data[1]).replace(/,/g, '')
                                }
                            }
                        %}

                        _ -> [ ]:* {%
                            function(data) {
                                return {
                                    nodeType: 'whiteSpace'
                                }
                            }
                        %}

                        assignment -> (declaration | identifier) _ "=" _ statement {%
                            function(data) {
                                return {
                                    nodeType: 'assignment',
                                    left: data[0][0],
                                    right: data[4][0]
                                }
                            }
                        %}

                        functionCall -> identifier _ "(" _ statement _ ")" {%
                            function(data) {
                                return {
                                    nodeType: 'functionCall',
                                    functionName: data[0],
                                    argument: data[4].nodeType === 'whiteSpace' ? undefined : data[4][0]
                                }
                            }
                        %}

                        declaration -> type _ identifier {%
                            function(data) {
                                return {
                                    nodeType: 'declaration',
                                    type: data[0],
                                    identifier: data[2]
                                }
                            }
                        %}

                        type -> "int" | ("int" _ "*") {%
                            function(data) {
                                let type;
                                if (Array.isArray(data[0])) {
                                    type = data[0][0] + data[0][2];
                                }
                                else {
                                    type = data[0];
                                }
                                return {
                                    nodeType: 'type',
                                    type: type
                                }
                            }
                        %}
                    */

                    let grammar = {
                        Lexer: undefined,
                        ParserRules: [
                        {"name": "Main", "symbols": ["statement"]},
                        {"name": "Main", "symbols": ["statement", "_", {"literal":";","pos":12}]},
                        {"name": "statement", "symbols": ["literal"]},
                        {"name": "statement", "symbols": ["identifier"]},
                        {"name": "statement", "symbols": ["assignment"]},
                        {"name": "statement", "symbols": ["functionCall"]},
                        {"name": "statement", "symbols": ["declaration"]},
                        {"name": "statement", "symbols": ["_"], "postprocess": 
                            function(data) {
                                return {
                                    nodeType: 'statement',
                                    statement: data[0]
                                }
                            }
                            },
                        {"name": "number$ebnf$1", "symbols": [/[0-9]/]},
                        {"name": "number$ebnf$1", "symbols": [/[0-9]/, "number$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
                        {"name": "number", "symbols": ["number$ebnf$1"], "postprocess": 
                            function(data) {
                                return {
                                    nodeType: 'number',
                                    number: data[0].join().replace(/,/g, '')
                                }
                            }
                            },
                        {"name": "literal", "symbols": ["number"], "postprocess": 
                            function(data) {
                                return {
                                    nodeType: 'literal',
                                    literal: data[0]
                                }
                            }
                            },
                        {"name": "identifier$ebnf$1", "symbols": []},
                        {"name": "identifier$ebnf$1", "symbols": [/[a-zA-Z0-9_]/, "identifier$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
                        {"name": "identifier", "symbols": [/[a-zA-Z_]/, "identifier$ebnf$1"], "postprocess": 
                            function(data) {
                                return {
                                    nodeType: 'identifier',
                                    identifier: (data[0] + data[1]).replace(/,/g, '')
                                }
                            }
                            },
                        {"name": "_$ebnf$1", "symbols": []},
                        {"name": "_$ebnf$1", "symbols": [/[ ]/, "_$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
                        {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": 
                            function(data) {
                                return {
                                    nodeType: 'whiteSpace'
                                }
                            }
                            },
                        {"name": "assignment$subexpression$1", "symbols": ["declaration"]},
                        {"name": "assignment$subexpression$1", "symbols": ["identifier"]},
                        {"name": "assignment", "symbols": ["assignment$subexpression$1", "_", {"literal":"=","pos":93}, "_", "statement"], "postprocess": 
                            function(data) {
                                return {
                                    nodeType: 'assignment',
                                    left: data[0][0],
                                    right: data[4][0]
                                }
                            }
                            },
                        {"name": "functionCall", "symbols": ["identifier", "_", {"literal":"(","pos":109}, "_", "statement", "_", {"literal":")","pos":117}], "postprocess": 
                            function(data) {
                                return {
                                    nodeType: 'functionCall',
                                    functionName: data[0],
                                    argument: data[4] === 'whiteSpace' ? data[4] : data[4][0]
                                }
                            }
                            },
                        {"name": "declaration", "symbols": ["type", "_", "identifier"], "postprocess": 
                            function(data) {
                                return {
                                    nodeType: 'declaration',
                                    type: data[0],
                                    identifier: data[2]
                                }
                            }
                            },
                        {"name": "type$string$1", "symbols": [{"literal":"i"}, {"literal":"n"}, {"literal":"t"}], "postprocess": function joiner(d) {return d.join('');}},
                        {"name": "type", "symbols": ["type$string$1"]},
                        {"name": "type$subexpression$1$string$1", "symbols": [{"literal":"i"}, {"literal":"n"}, {"literal":"t"}], "postprocess": function joiner(d) {return d.join('');}},
                        {"name": "type$subexpression$1", "symbols": ["type$subexpression$1$string$1", "_", {"literal":"*","pos":146}]},
                        {"name": "type", "symbols": ["type$subexpression$1"], "postprocess": 
                            function(data) {
                                let type;
                                if (Array.isArray(data[0])) {
                                    type = data[0][0] + data[0][2];
                                }
                                else {
                                    type = data[0];
                                }
                                return {
                                    nodeType: 'type',
                                    type: type
                                }
                            }
                            }
                    ]
                      , ParserStart: "Main"
                    }

                    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

                    let syntaxError = false;

                    try {
                        parser.feed(command.trim());
                    }
                    catch (ex) {
                        syntaxError = true;
                        historyToAdd.push({
                            style: 'error',
                            text: ex.message.slice(0, ex.message.search('Instead, ')).replace(/line [0-9]+ /, ''),
                        });
                    }

                    if (!syntaxError) {
                        try {
                            let result = window.engine.evaluate(parser.results);

                            if (result.actionHadSideEffect) {
                                setUiState(window.engine.getState());
                            }

                            if (result !== undefined && result.toString() !== '') {
                                if (result.nodeType === 'variable') {
                                    result = result.value;
                                }
                                else if (result.nodeType === 'identifier') {
                                    result = undefined;
                                }
                                else if (result.nodeType === 'ui-action') {
                                    if (result.action === 'clearConsole') {
                                        setCommandHistory([]);
                                        return;
                                    }
                                    else {
                                        throw new Error('Internal error: Unsupported UI action.');
                                    }
                                }
                            }

                            if (result === undefined) {
                                result = 'null';
                            }

                            historyToAdd.push({
                                style: 'info',
                                text: `-> ${result.toString()}`,
                            });
                        }
                        catch (ex) {
                            historyToAdd.push({
                                style: 'error',
                                text: ex.message,
                            });
                        }
                    }

                    setCommandHistory([...commandHistory, ...historyToAdd]);
                }}
            />
        </div>
    );
}

export default App;
