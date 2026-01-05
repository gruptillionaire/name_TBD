# Project Brief

A mobile React Native app for iOS and Android based on publishing one daily comment for a specific area.

## Location Hierarchy

Comments exist in a three-tier hierarchy:
- Country
- City
- Specific area (user-created pins)

Viewing a country shows comments for that country, all cities within, and all specific areas.
Viewing a city shows comments for that city and all specific areas within.
Viewing a specific area shows only comments for that pin.

**Example:**
A user posts a comment for a church in London in the UK.
- Users viewing the UK can see this comment
- Users viewing London can see this comment
- Users viewing the church pin can see this comment
- Users viewing Plymouth cannot see this comment
- Users viewing Parliament (different pin in London) cannot see this comment

## Specific Areas (Pins)

Specific areas are handled via user-created pins (similar to Pokemon Go):
- Users can drop a pin on the map when posting a comment to a location that doesn't have one
- A minimum distance threshold prevents duplicate pins for the same location
- Pin naming uses Google Places API reverse lookup - when a user drops a pin, the app suggests nearby known places ("Did you mean St. Paul's Cathedral?") and inherits the name if confirmed
- Since users can only post one message per day, they can only create one pin per day, preventing pin spam

## Interaction

- Users can post one comment per day
- Other users can only like or dislike comments - no other interaction
- Comments bubble up through the hierarchy based on popularity

## Map & Discovery

- Users select areas via an interactive map with a heat map overlay showing comment activity
- High-ranking comments pop up on the map (e.g., a popular Birmingham comment shows when viewing the UK)
- If popular enough, comments can appear at the planet zoom level
- Pop-up messages have a minimum distance threshold to prevent clumping
- The current closest area is highlighted when opening the map

## Area Page

Upon selecting an area, users see the top comments of the day. Sorting options:
- New
- Top most liked
- Top most disliked
- Old

Users can filter by date to see the message history of an area.

## Content Moderation & Translation

- Messages are filtered for abuse using a word-list library (e.g., `bad-words` or `leo-profanity`)
- Auto-translation via LibreTranslate (self-hosted) or MyMemory API (free tier)

## First Time Experience

1. User creates an account and logs in
2. Presented with a map showing a heat map of comments
3. Starts zoomed into their current country (based on device location), can zoom out to anywhere
4. Selects an area
5. Prompted to write a message
6. Scrolls through others and gives one a like or dislike

## Launch Strategy (Cold-Start)

- Geo-focused launch: Start in one city to build comment density before expanding
- Seed content: Team posts interesting comments in key locations before launch
- "Be the first" messaging: Frame empty areas as opportunities
- Historical view: Show older comments rather than hiding them
- Local partnerships: Work with local influencers in the launch city