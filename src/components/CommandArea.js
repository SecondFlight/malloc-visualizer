import React, { useState } from 'react';
import CommandInput from './CommandInput.js';
import CommandHistory from './CommandHistory.js';
import { useSpring, animated } from 'react-spring';

function CommandArea(props) {
    const [height, setHeight] = useState(200);

    const [{ height: animatedHeight }, setCommandHeight] = useSpring(() => ({ height: 300, config: { mass: 1, tension: 540, friction: 56 } }));

    if (height !== props.height) {
        setHeight(props.height);
        setCommandHeight({ height: props.height });
    }

    // Styles:
    //  - command (for actual commands)
    //  - error (syntax or runtime errors)
    //  - info (non-error feedback)
    // const pushToHistory = (payload, style) => {
    //     let newHistoryItem = {};
    //     newHistoryItem.style = style;
    //     newHistoryItem.text = payload;
    //     setCommandHistory([...commandHistory, newHistoryItem]);
    // }

    return (
        <animated.div className="command-area" style={{
            height: animatedHeight,
        }}>
            <CommandHistory history={props.commandHistory} />
            <CommandInput
                getPrediction={props.getPrediction}
                onCommand={command => props.onCommand(command)}
            />
        </animated.div>
    );
}

export default CommandArea;