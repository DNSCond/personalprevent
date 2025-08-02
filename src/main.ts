import { UserV2 } from '@devvit/protos/types/devvit/reddit/v2alpha/userv2';
import { Devvit, Post, TriggerContext, Comment } from '@devvit/public-api';

Devvit.configure({ redditAPI: true, });

Devvit.addSettings([
    {
        type: 'select',
        name: 'action',
        label: 'what to do with guilty',
        options: [
            { label: 'ban user', value: 'banUser' },
            { label: 'remove comment or post', value: 'remove' },
            { label: 'report (or modmail if remove is chosen)', value: 'report' },
        ],
        defaultValue: ['report'],
        multiSelect: true,
    },
]);

Devvit.addTrigger({
    events: ['PostCreate', 'PostUpdate', 'CommentCreate', 'CommentUpdate'],
    onEvent: async (event, context) => {
        // Determine the user and item based on event type
        let user: UserV2, item: Post | Comment, body: string;
        if (event.type === 'PostCreate' || event.type === 'PostUpdate') {
            item = await context.reddit.getPostById(event.post.id);
            user = event.author;
            let title: string;
            ({ title, body } = (await context.reddit.getPostById(item.id)) ?? {});
            body = title + '\n\n' + body;
        } else if (event.type === 'CommentCreate' || event.type === 'CommentUpdate') {
            ({ body } = (item = await context.reddit.getCommentById(event.comment.id)));
            user = event.author;
        }
        // Call your handler
        await onThingUpdate(String(body), user, context, item);
    },
});

async function onThingUpdate(body: string, user: UserV2, context: TriggerContext, item: Post | Comment) {
    const isGuilty = validateStringText(body), actions: string[] = (await context.settings.get('action')) ?? [];
    const subredditName = await context.reddit.getCurrentSubredditName(), username = user.name;
    if (!subredditName) return;
    if (isGuilty) {
        if (actions.includes('banUser')) {
            context.reddit.banUser({
                context: item.id, subredditName, username,
                message: 'you have been banned for stating your age\n\ni may be incorrect because im a bot'
            });
        }
        if (actions.includes('remove')) item.remove();
        if (actions.includes('report')) context.reddit.report(item, {
            reason: 'this user might state their age',
        });
    }
}

function validateStringText(body: string): boolean {
    const numberWords = {
        one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
        eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
        sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
        twentyone: 21, twentytwo: 22, twentythree: 23, twentyfour: 24,
        twentyfive: 25,
    }, text = body.toLocaleLowerCase().trim().replace(/[^a-z0-9]/, '');
    if (/i(am|m)?\d{1,2}/.test(text)) return true;
    if (/i(am|m)?a?minor/.test(text)) return true;
    if (/i(am|m)?under/.test(text)) return true;
    if (/justturned\d{1,2}/.test(text)) return true;
    if (/turned\d{1,2}/.test(text)) return true;
    // Match word-number expressions
    for (let word in numberWords) {
        if (text.includes(`im${word}`) ||
            text.includes(`iam${word}`) ||
            text.includes(`justturned${word}`)
            || text.includes(`turned${word}`)
        ) return true;
    }

    return false;
}

export default Devvit;
