import React, { useState } from 'react';
import './App.css';
import CommandArea from './components/CommandArea.js';
import MemoryVisualizer from './components/MemoryVisualizer.js';
import nearley from 'nearley';
import Engine from './core/engine.js';
import Grammar from './core/grammar.js';

function App(props) {
    const [commandHeight, setCommandHeight] = useState(500);
    const [isDragActive, setIsDragActive] = useState(false);
    const [commandHistory, setCommandHistory] = useState([]);
    const [uiState, setUiState] = useState([]);

    if (window.engine === undefined) {
        window.engine = new Engine();
        setUiState(window.engine.getState());
    }

    if (commandHistory.length === 0) {
        setCommandHistory([
            {
                style: 'info',
                text: '-> Type help() for usage.'
            }
        ]);
    }

    let handleMouseMove = event => {
        if (!isDragActive) {
            return;
        }

        let pageHeight = document.querySelector('body').clientHeight;

        let newHeight = pageHeight - event.pageY;
        if (newHeight < 250) {
            newHeight = 250;
        } else if (newHeight > (pageHeight * 4) / 7) {
            newHeight = (pageHeight * 4) / 7;
        }
        newHeight -= 3; // Account for spacer height
        setCommandHeight(newHeight);
    };

    return (
        <div
            className="App"
            style={{
                cursor: isDragActive ? 'ns-resize' : undefined
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={() => {
                setIsDragActive(false);
            }}
        >
            <div className="mainContent" style={{ flex: 1 }}>
                <MemoryVisualizer memState={uiState} />
            </div>
            <div
                className="spacer"
                onMouseDown={() => {
                    setIsDragActive(true);
                }}
                style={{
                    height: 6
                }}
            />
            <CommandArea
                height={commandHeight}
                commandHistory={commandHistory}
                getPrediction={text => {
                    let spaceSplit = text.split(' ');
                    let spaceLastWord = spaceSplit[spaceSplit.length - 1];

                    let parenthesisSplit = text.split('(');
                    let parenthesisLastWord = parenthesisSplit[parenthesisSplit.length - 1];

                    if (spaceLastWord === '' || parenthesisLastWord === '') {
                        return text;
                    }

                    const zeroArgumentFunctions = [
                        'help',
                        'reset',
                        'clearConsole',
                        'coalesce',
                        'getAllocationMethod',
                        'freeAll'
                    ];
                    const oneArgumentFunctions = [
                        'malloc',
                        'free',
                        'setMemorySize',
                        'sizeof',
                        'setAllocationMethod'
                    ];

                    let identifiers = window.engine.getIdentifiers();
                    let functions = window.engine.getFunctions();

                    let predictions = oneArgumentFunctions
                        .map(elem => elem + '(')
                        .concat(zeroArgumentFunctions.map(elem => elem + '()'))
                        .concat(identifiers.filter(identifier => !functions.includes(identifier)));

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
                    });

                    // Grammar is imported from core/grammar.js
                    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(Grammar));

                    let syntaxError = false;

                    try {
                        parser.feed(command.trim());
                    } catch (ex) {
                        syntaxError = true;
                        historyToAdd.push({
                            style: 'error',
                            text: ex.message
                                .slice(0, ex.message.search('Instead, '))
                                .replace(/line [0-9]+ /, '')
                        });
                    }

                    if (!syntaxError) {
                        try {
                            let result = window.engine.evaluate(parser.results);

                            setUiState(window.engine.getState());

                            if (result !== undefined && result.toString() !== '') {
                                if (result.nodeType === 'variable') {
                                    result = result.value;
                                } else if (result.nodeType === 'identifier') {
                                    result = undefined;
                                } else if (result.nodeType === 'ui-action') {
                                    if (result.action === 'clearConsole') {
                                        setCommandHistory([]);
                                        return;
                                    } else {
                                        throw new Error('Internal error: Unsupported UI action.');
                                    }
                                }
                            }

                            if (result === undefined) {
                                result = 'null';
                            }

                            historyToAdd.push({
                                style: 'info',
                                text: `-> ${result.toString()}`
                            });
                        } catch (ex) {
                            // throw ex;
                            historyToAdd.push({
                                style: 'error',
                                text: ex.message
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
