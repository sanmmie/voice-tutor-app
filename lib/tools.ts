import { evaluate } from 'mathjs';
import { ToolDefinition } from './types';

// --- Tool Definitions (sent to AssemblyAI in session.update) ---

export const toolDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    name: 'calculate',
    description: 'Evaluate a mathematical expression. Use this whenever the user asks a math question or wants to compute something.',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: "The math expression to evaluate, e.g. '3 * (4 + 2)' or 'sqrt(16)'",
        },
      },
      required: ['expression'],
    },
  },
  {
    type: 'function',
    name: 'search_docs',
    description: 'Search for information about a programming concept, algorithm, or technical topic. Use this when the user asks about a concept they want to learn about.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: "The concept or topic to search for, e.g. 'recursion', 'binary search tree', 'Python lambda functions'",
        },
      },
      required: ['query'],
    },
  },
  {
    type: 'function',
    name: 'get_code_example',
    description: 'Get a code example for a programming concept. Use this when the user asks to see code or an example.',
    parameters: {
      type: 'object',
      properties: {
        concept: {
          type: 'string',
          description: "The programming concept to show an example for, e.g. 'reverse a string in Python', 'React useState hook'",
        },
        language: {
          type: 'string',
          description: 'The programming language (optional, defaults to Python)',
          enum: ['python', 'javascript', 'typescript', 'java', 'c++', 'go', 'rust'],
        },
      },
      required: ['concept'],
    },
  },
];

// --- Tool Handlers (executed server-side) ---

// Static code examples map
const codeExamples: Record<string, Record<string, string>> = {
  'reverse a string': {
    python: `def reverse_string(s):\n    return s[::-1]\n\n# Example\nprint(reverse_string("hello"))  # "olleh"`,
    javascript: `function reverseString(str) {\n  return str.split('').reverse().join('');\n}\n\nconsole.log(reverseString("hello")); // "olleh"`,
    typescript: `function reverseString(str: string): string {\n  return str.split('').reverse().join('');\n}\n\nconsole.log(reverseString("hello")); // "olleh"`,
    java: `public class Main {\n  public static String reverseString(String str) {\n    return new StringBuilder(str).reverse().toString();\n  }\n\n  public static void main(String[] args) {\n    System.out.println(reverseString("hello")); // "olleh"\n  }\n}`,
  },
  'fibonacci': {
    python: `def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\n# First 10 Fibonacci numbers\nprint([fibonacci(i) for i in range(10)])`,
    javascript: `function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + fibonacci(n-2);\n}\n\nconsole.log(Array.from({length: 10}, (_, i) => fibonacci(i)));`,
  },
  'react usestate': {
    javascript: `import React, { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  \n  return (\n    <div>\n      <p>You clicked {count} times</p>\n      <button onClick={() => setCount(count + 1)}>\n        Click me\n      </button>\n    </div>\n  );\n}`,
    typescript: `import React, { useState } from 'react';\n\ninterface CounterProps {}\n\nconst Counter: React.FC<CounterProps> = () => {\n  const [count, setCount] = useState<number>(0);\n  \n  return (\n    <div>\n      <p>You clicked {count} times</p>\n      <button onClick={() => setCount(count + 1)}>\n        Click me\n      </button>\n    </div>\n  );\n};\n\nexport default Counter;`,
  },
};

function findBestMatch(concept: string, language: string): string | null {
  const lower = concept.toLowerCase();
  // Try exact match first
  for (const [key, examples] of Object.entries(codeExamples)) {
    if (lower.includes(key) || key.includes(lower)) {
      const lang = language in examples ? language : 'python';
      return examples[lang] || examples.python;
    }
  }
  return null;
}

export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case 'calculate': {
      const { expression } = args;
      if (!expression) throw new Error('Missing expression');
      try {
        const result = evaluate(expression);
        return { expression, result };
      } catch (err) {
        throw new Error(`Invalid math expression: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }

    case 'search_docs': {
      const { query } = args;
      if (!query) throw new Error('Missing query');
      const encoded = encodeURIComponent(query);
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          return { query, found: false, message: `No Wikipedia article found for "${query}".` };
        }
        throw new Error(`Wikipedia API error: ${res.status}`);
      }
      const data = await res.json();
      return {
        query,
        found: true,
        title: data.title,
        extract: data.extract || 'No summary available.',
        url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encoded}`,
      };
    }

    case 'get_code_example': {
      const { concept, language = 'python' } = args;
      if (!concept) throw new Error('Missing concept');
      const code = findBestMatch(concept, language);
      if (!code) {
        return {
          concept,
          language,
          found: false,
          message: `No code example available for "${concept}" in ${language}. Try a different concept (e.g., 'reverse a string', 'fibonacci', 'react usestate').`,
        };
      }
      return {
        concept,
        language,
        found: true,
        code,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}