import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const WHEREBY_API_KEY = Deno.env.get('WHEREBY_API_KEY');
const WHEREBY_API_URL = 'https://api.whereby.dev/v1/meetings';

serve(async (req) => {
  const { classId, className, startDate } = await req.json();

  if (!classId || !className || !startDate) {
    return new Response(JSON.stringify({ error: 'Missing classId, className, or startDate' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Set the meeting to end 24 hours after the class starts
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const response = await fetch(WHEREBY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHEREBY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isLocked: true,
        roomNamePattern: 'uuid',
        roomMode: 'group',
        title: className,
        endDate: endDate.toISOString(),
        fields: ['hostRoomUrl'],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Whereby API error: ${response.status} ${errorBody}`);
    }

    const wherebyData = await response.json();
    const { roomUrl, meetingId } = wherebyData;

    if (!roomUrl) {
      throw new Error('Failed to get roomUrl from Whereby API response.');
    }

    // Save the Whereby link to the class in Supabase
    const { error: supabaseError } = await supabase
      .from('classes')
      .update({ whereby_link: roomUrl, whereby_meeting_id: meetingId })
      .eq('id', classId);

    if (supabaseError) {
      throw new Error(`Supabase error: ${supabaseError.message}`);
    }

    return new Response(JSON.stringify({ success: true, roomUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Generate Whereby link error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
