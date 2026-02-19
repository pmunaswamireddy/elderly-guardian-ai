import asyncio
import edge_tts

async def list_voices():
    voices = await edge_tts.VoicesManager.create()
    for v in voices.voices:
        if '-IN' in v['ShortName'] or 'en-US' in v['ShortName']:
            print(f"{v['ShortName']} ({v['Gender']})")

if __name__ == "__main__":
    asyncio.run(list_voices())
