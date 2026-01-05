A mobile react native app for iOS and Android based on publishing one daily comment for a specific area. There is a priority for comments:
- country
- city
- specific area

wherein seeing a country's comments will show comments for that specific country, all the cities within, and the specific areas.
Seeing a city will show all the comments for that city, then all the comments within.
Seeing comments for a specific area will only show it for that area.
E.G.:
A user posts a comment for a church in London in the UK.
Users looking at the UK can see this comment, users looking at London can see this comment, users looking at the church can see this comment.
Users looking at the UK and Plymouth cannot see this comment. Users looking at the UK and London, but Parliament, cannot see this church's comment.

Other users can only like and dislike a comment - this is the only means of interaction.
People can select the areas by map, with high ranking comments for that day popping up (e.g. if in Birmingham there has been an incredibly popular comment, when looking at the UK it may pop up with a note at Birmingham, signifying to the user that there is thriving message activity here. If this message in Birmingham is popular enough, it will show to users that are scrolled out on the planet level.) Pop-up messages cannot occur too close to each other for clumping reasons.

To select an area, open the map and the current closest thing will be highlighted. In the case of specific areas which cannot be highlighted, users can drag and drop a pin on the map to specify where they would like to place their message.
The user is then sent to the page of that area, which automatically shows the top comments of the day. The user can sort by new, top most liked, top most disliked, and old, then they can filter dates to see the message history of the area.

Messages are filtered for abuse before being sent & auto-translated to the reader.




First time experience: A user creates an account, logs in, then must pick a geographical area to inspect. There is a heat map of comments. The user will start zoomed into the country their device is registered to be in at that moment, though they can zoom out if they please to move to any area. Upon selecting their area they are prompted to write a message, then scroll through others and give one a like or dislike.