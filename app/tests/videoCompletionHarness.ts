const { api } = await import("../src/routes");
const { db } = await import("../src/db");

db.prepare("INSERT INTO channels(channel_id, title, url) VALUES(?, ?, ?)")
  .run("UCcomplete", "Completion channel", "https://youtube.com/channel/UCcomplete");

const addVideo = db.prepare("INSERT INTO videos(video_id, channel_id, title, published_at, duration) VALUES(?, ?, ?, ?, ?)");
addVideo.run("partial1", "UCcomplete", "Partially watched", "2026-11-01 00:00:00", "1000");
addVideo.run("neverplayed", "UCcomplete", "Never played", "2026-11-01 00:00:00", "1000");

db.prepare("INSERT INTO user_videos(user_id, video_id, status, watch_position, watch_duration) VALUES(1, ?, 'inbox', 100, 1000)")
  .run("partial1");

const request = (profileId: number, path: string, method = "GET") => api.request(`http://localhost${path}`, {
  method,
  headers: { Cookie: `ytzero_profile=${profileId}` },
});

// Continue watching requires a history row, which opening the watch page creates.
await request(1, "/videos/partial1/watch", "POST");

const beforeResponse = await request(1, "/in-progress");
const before = await beforeResponse.json() as any;

const completeResponse = await request(1, "/videos/partial1/complete", "POST");

const afterResponse = await request(1, "/in-progress");
const after = await afterResponse.json() as any;

const row = db.prepare("SELECT watch_position, watch_duration, watched FROM user_videos WHERE user_id = 1 AND video_id = ?")
  .get("partial1") as { watch_position: number | null; watch_duration: number | null; watched: number | null };

console.log("RESULT " + JSON.stringify({
  beforeStatus: beforeResponse.status,
  beforeIds: before.videos.map((video: any) => video.video_id),
  completeStatus: completeResponse.status,
  afterStatus: afterResponse.status,
  afterIds: after.videos.map((video: any) => video.video_id),
  position: row.watch_position,
  duration: row.watch_duration,
  watched: row.watched,
}));

db.close();
