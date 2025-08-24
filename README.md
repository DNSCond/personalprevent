# personalprevent: no one needs to know your age

personalprevent is a devvit bot that reports posts or comments that may reveal a user's age primarily their own in english.

personalprevent scans new or updated posts and comments in your subreddit for phrases that might indicate a user's age (e.g., "I am 16" or "just turned 18").
It can also check if the content is written in English. the bot reports these items for moderator review, helping you enforce community rules about age disclosure.

## Key Features

- **Age Detection**: Identifies phrases like "I'm 15," "turned 12," or "teenager" in posts and comments.
- **English Language Check**: Optionally checks if content is mostly in English (useful for subreddits requiring English posts).
- **Customizable Filters**: Choose which checks to apply (e.g., age detection only or age + English).
- **Moderator Tools**: Includes menu options to manually test comments or text for age or English content.
- **Reports for Review**: Automatically reports flagged content to moderators with details (e.g., the matched phrase and detection confidence).

## Notes

- The English word list is sourced from [github.com/dwyl/english-words](https://github.com/dwyl/english-words).
- The bot's "aggressive" age filter catches broader terms but may have false positives (e.g., flagging "teen" in unrelated contexts). Use with caution.
- If you encounter issues or have feature requests, feel free to share feedback to [u/antboiy](https://www.reddit.com/message/compose/?to=antboiy&subject=personalprevent).

## changelog

### 0.1.1: activation

- the english filter is now activatable.

### 0.1.0: devvit publish --public

- the bot is now in review for being public
