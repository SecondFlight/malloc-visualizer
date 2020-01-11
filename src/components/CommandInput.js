import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useSpring, animated } from 'react-spring';

function CommandInput(props) {
    const [text, setText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const { transform } = useSpring({
        transform: `translateX(${text !== '' || isFocused || isHovered ? 0 : -10}px)`
    });

    return (
        <div className="command-input-container">
            <animated.div className="command-input-arrow" style={{ transform }}>
                {'>'}
            </animated.div>
            <div
                className="command-input"
                onMouseEnter={() => {
                    setIsHovered(true);
                }}
                onMouseLeave={() => {
                    setIsHovered(false);
                }}
            >
                <div className="code-render">
                    <span style={{opacity: 0.5}}>
                        <SyntaxHighlighter language="c" style={atomDark}>
                            {props.getPrediction(text)}
                        </SyntaxHighlighter>
                    </span>
                </div>
                <div className="code-render">
                    <SyntaxHighlighter language="c" style={atomDark}>
                        {text}
                    </SyntaxHighlighter>
                </div>
                <input
                    spellCheck="false"
                    value={text}
                    onChange={(e) => {
                        setText(e.currentTarget.value);
                    }}
                    onFocus={() => {
                        setIsFocused(true);
                    }}
                    onBlur={() => {
                        setIsFocused(false);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Tab") {
                            e.preventDefault();
                            let prediction = props.getPrediction(text);
                            setText(prediction);
                            return;
                        }
                        else if (e.key === "Enter") {
                            if (text === '') {
                                return;
                            }
                            props.onCommand(text);
                            setText('');
                            return;
                        }
                    }}
                />
            </div>
        </div>
    );
}

export default CommandInput;
