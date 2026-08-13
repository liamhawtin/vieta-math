import stringify from 'json-stable-stringify';
import Lexer from "../src/Lexer";

// JSON serializer

const typeFirstCompare = (a, b) => {
    if (a.key === 'type') {
        return -1;
    } else if (b.key === 'type') {
        return 1;
    } else {
        return a.key < b.key ? -1 : 1;
    }
};

const replacer = (key, value) => {
    if (value instanceof Lexer) {
        return {
            input: value.input,
            // omit value.settings
            lastIndex: value.tokenRegex.lastIndex,
        };
    } else {
        return value;
    }
};

const serializer = {
    print(val) {
        return stringify(val, {
            cmp: typeFirstCompare,
            space: '  ',
            replacer: replacer,
        });
    },
    test(val) {
        // Leave strings (e.g. XML) to other serializers
        return typeof val !== "string";
    },
};

expect.addSnapshotSerializer(serializer);
