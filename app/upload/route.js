import { put } from '@vercel/blob';

export async function POST(req) {
  const form = await req.formData();
  const blob = form.get('file');
  const name = form.get('name');

  try {
    const filename = `tmp${Date.now()}${Math.round(Math.random() * 100000)}_${name}`;

    const uploadedBlob = await put(filename, blob, {
      access: 'public',
    });

    return new Response(JSON.stringify({
      name,
      url: uploadedBlob.url,
    }), {
      status: 200,
    });
  } catch (error) {
    console.log(error);

    return new Response(JSON.stringify({
      name,
      url: '',
    }), {
      status: 500,
    });
  }
}