import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const backendUrl = req.headers.get('x-target-backend') || 'http://localhost:3001/images/transform';

    // Parse the incoming multipart form data
    const formData = await req.formData();

    // Forward the multipart request to the Go backend
    const backendRes = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
      headers: {
        // Let fetch calculate correct multipart boundary
      },
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text().catch(() => backendRes.statusText);
      return NextResponse.json(
        {
          error: `Go backend responded with status ${backendRes.status}`,
          details: errText,
        },
        { status: backendRes.status }
      );
    }

    // Return the ZIP stream
    const zipBuffer = await backendRes.arrayBuffer();
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="results.zip"',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: 'Failed to connect to backend service',
        message: err.message || 'Connection refused or timed out',
        hint: 'Ensure your Go server is running (`go run ./cmd/expense-app`) or switch to the in-browser transformation engine.',
      },
      { status: 502 }
    );
  }
}
