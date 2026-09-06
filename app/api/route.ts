import { NextRequest, NextResponse } from 'next/server';
import { executeTool } from '@/lib/tools';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, args } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing tool name' },
        { status: 400 }
      );
    }

    const result = await executeTool(name, args);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tool execution failed' },
      { status: 500 }
    );
  }
}