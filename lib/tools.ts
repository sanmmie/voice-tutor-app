import { evaluate } from 'mathjs';
import { ToolDefinition } from './types';

let documentStore: { content: string; type: 'image' | 'pdf'; name: string } | null = null;

export function setDocumentContent(content: string, type: 'image' | 'pdf', name: string) {
  documentStore = { content, type, name };
}

export function getDocumentContent() {
  return documentStore;
}

export function clearDocumentContent() {
  documentStore = null;
}

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
  {
    type: 'function',
    name: 'read_document',
    description: 'Read the content of an uploaded document (image or PDF) that the user has shared. Use this when the user references an uploaded file, asks about a diagram, code screenshot, or handwritten problem they shared.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
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
  // Match on whole tokens only, bounded by word boundaries, so "reverse a
  // string" matches but "reversed" or "string reversal" do not spuriously
  // match. Prefer the longest matching key so "react usestate" beats "react".
  let best: { key: string; example: string } | null = null;
  for (const [key, examples] of Object.entries(codeExamples)) {
    const regex = new RegExp(`(^|[^a-z0-9])${escapeRegex(key)}([^a-z0-9]|$)`, 'i');
    if (regex.test(lower)) {
      const example = examples[language] || examples.python;
      if (!best || key.length > best.key.length) best = { key, example };
    }
  }
  return best?.example ?? null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case 'calculate': {
      const { expression } = args;
      if (typeof expression !== 'string' || !expression.trim()) throw new Error('Missing expression');
      if (expression.length > 500) throw new Error('Expression is too long');
      // Blocklist is a defense-in-depth net, not a security boundary: the
      // real protection is that mathjs `evaluate` only exposes math, not JS.
      // Match whole tokens (bounded by whitespace, parens, operators, or
      // string boundaries) so a legitimate variable named `importance` or
      // `simplifyX` is not falsely rejected.
      const blocked = /\b(?:import|require|process|eval|Function|constructor|globalThis|window|document|fetch|XMLHttpRequest|child_process|fs\b|os\b|crypto\b|net\b|tls\b|cluster\b|worker_threads|require\.main|module\.exports|__dirname|__filename)\b/i.test(expression);
      if (blocked) throw new Error('Expression contains an unsupported operation');
      try {
        const result = evaluate(expression);
        return { expression, result };
      } catch (err) {
        throw new Error(`Invalid math expression: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }

    case 'search_docs': {
      const { query } = args;
      if (typeof query !== 'string' || !query.trim()) throw new Error('Missing query');
      if (query.length > 200) throw new Error('Search query is too long');
      const encoded = encodeURIComponent(query);
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
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

    case 'read_document': {
      const doc = getDocumentContent();
      if (!doc) {
        return {
          found: false,
          message: 'No document has been uploaded yet. Please upload an image or PDF first.',
        };
      }
      return {
        found: true,
        type: doc.type,
        name: doc.name,
        content: doc.content,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}