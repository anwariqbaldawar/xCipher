import { ImageResponse } from 'next/og';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const hasTitle = searchParams.has('title');
    const title = hasTitle
      ? searchParams.get('title')?.slice(0, 100)
      : 'xSypher';

    const author = searchParams.get('author') || 'xSypher Editorial';
    const category = searchParams.get('category') || 'NEWS';

    return new ImageResponse(
      (
        <div tw="flex flex-col w-full h-full bg-[#0c0d10] p-20 justify-between font-sans">
          <div tw="flex w-full justify-between items-center">
            <div tw="flex text-4xl font-extrabold text-white tracking-tighter">
              x<span tw="text-[#f04552]">Sypher</span>
            </div>
            <div tw="flex text-2xl font-bold text-[#f04552] uppercase tracking-widest">
              {category}
            </div>
          </div>

          <div tw="flex text-[72px] font-extrabold text-white leading-tight tracking-tight mt-10 mb-auto">
            {title}
          </div>

          <div tw="flex w-full items-center mt-10">
            <div tw="flex w-[60px] h-[60px] rounded-full bg-[#1f2127] border-2 border-[#f04552]"></div>
            <div tw="flex flex-col ml-5">
              <div tw="flex text-2xl font-semibold text-white">{author}</div>
              <div tw="flex text-xl text-[#a1a1aa]">xSypher Desk</div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error(e);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
