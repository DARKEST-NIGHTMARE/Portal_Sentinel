from datetime import datetime, timedelta, timezone

timezone_offset = "+05:30"
date_str = "2026-03-05"
start_time = "09:00"
end_time = "09:30"

req_start = datetime.fromisoformat(f"{date_str}T{start_time}:00{timezone_offset}")
req_end = datetime.fromisoformat(f"{date_str}T{end_time}:00{timezone_offset}")

print("Req start:", req_start)
print("Req end:", req_end)

events = [
    {
        "start_at": "2026-03-05T09:00:00Z", # This is what currently exists if the last booking went to UTC 9AM instead of Local 9AM
        "end_at": "2026-03-05T10:30:00Z",   
        "all_day": False
    },
    {
        "start_at": "2026-03-05T03:30:00Z", # This is what a correct 9AM IST booking looks like
        "end_at": "2026-03-05T05:00:00Z",   
        "all_day": False
    }
]

busy = []
for ev in events:
    if ev.get("all_day"):
        continue
    ev_start_str = ev["start_at"].replace("Z", "+00:00")
    ev_end_str = ev["end_at"].replace("Z", "+00:00")
    
    ev_start = datetime.fromisoformat(ev_start_str).astimezone(req_start.tzinfo)
    ev_end = datetime.fromisoformat(ev_end_str).astimezone(req_start.tzinfo)
    busy.append((ev_start, ev_end))
    print(f"Busy slot (converted to local): {ev_start} to {ev_end}")

busy.sort(key=lambda x: x[0])

conflicts = []
for b_start, b_end in busy:
    if req_start < b_end and req_end > b_start:
        conflicts.append({
            "start": b_start.strftime("%H:%M"),
            "end": b_end.strftime("%H:%M"),
        })

print("Conflicts:", conflicts)

work_start = datetime.fromisoformat(f"{date_str}T09:00:00{timezone_offset}")
work_end = datetime.fromisoformat(f"{date_str}T18:00:00{timezone_offset}")
min_slot = timedelta(minutes=30)

merged = []
for start, end in busy:
    start = max(start, work_start)
    end = min(end, work_end)
    if start >= end:
        continue
    if merged and start <= merged[-1][1]:
        merged[-1] = (merged[-1][0], max(merged[-1][1], end))
    else:
        merged.append((start, end))

free_slots = []
cursor = work_start
for b_start, b_end in merged:
    if b_start - cursor >= min_slot:
        free_slots.append({
            "start": cursor.strftime("%H:%M"),
            "end": b_start.strftime("%H:%M"),
        })
    cursor = max(cursor, b_end)
if work_end - cursor >= min_slot:
    free_slots.append({
        "start": cursor.strftime("%H:%M"),
        "end": work_end.strftime("%H:%M"),
    })

print("Available:", free_slots)
