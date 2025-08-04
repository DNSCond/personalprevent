import { UserV2 } from '@devvit/protos/types/devvit/reddit/v2alpha/userv2';
import { Devvit, Post, TriggerContext, Comment } from '@devvit/public-api';

Devvit.configure({ redditAPI: true, });

// Devvit.addSettings([{type: 'select', name: 'action',
// label: 'what to do with guilty',options:
// [ { label: 'ban user', value: 'banUser' },
// { label: 'remove comment or post', value: 'remove' },
// { label: 'report (or modmail if remove is chosen)', value: 'report' },
// ],defaultValue: ['report'],multiSelect: true,},]);

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

async function onThingUpdate(body: string, _user: UserV2, context: TriggerContext, item: Post | Comment) {
    const isGuilty = validateStringText(body);//, actions: string[] = (await context.settings.get('action')) ?? [];
    const subredditName = await context.reddit.getCurrentSubredditName();//, username = user.name;
    if (!subredditName) return;
    if (isGuilty) {
        // if (actions.includes('banUser')) {context.reddit.banUser({context: item.id, subredditName, username,
        // message: 'you have been banned for stating your age\n\nnote: i may be incorrect because im a bot'
        // });} if (actions.includes('remove')) item.remove(); else if (actions.includes('report'))
        await context.reddit.report(item, { reason: `this user might state their age (${context.appVersion}) {{${isGuilty}}}`, });
    }
}

function validateStringText(body: string): any {
    const numberWords = {
        one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
        eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
        sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
        twentyone: 21, twentytwo: 22, twentythree: 23, twentyfour: 24,
        twentyfive: 25, thirty: 30, forty: 40, fifty: 50, sixty: 60,
        seventy: 70, eighty: 80, ninety: 90, hundred: 100,
    }, text = body.replace(/!\[(?:img|gif)]\([a-z0-9]+\)/gi, '')
        .toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const comparisons = [
        /i(?:am|m)?a?minor/,
        /turn(?:ed|ing)\d{1,2}/,
        /i(?:am|m)?under\d{1,2}/,
        /i(?:am|m)?(?:a|like)?\d{1,2}/,
        /i(?:am|m)?(?:about|around|almost|over|past|inmy|recently|just|nearly)\d{1,2}/,
        /i(?:am|m)?a?(?:teen|teenager|adult|senior)/,
        /\d{1,2}(?:r?st|nd|rd|th)?b(?:irth)?day/,
        /i(?:am|m)?celebratingMy\d{1,2}/i,
    ];
    const { value } = findFirstTruthy(comparisons, regex => regex.test(text));
    // if (comparisons.some(regex => regex.test(text))) return true;
    if (value) return (value.exec(text) ?? [true])[0];
    for (const regex of comparisons) {
        for (let word in numberWords) {
            const exec = RegExp(regex.source.replace('\\d{1,2}', word.replace('y', '(?:y|ies?)')), regex.flags).exec(text);
            if (exec) return exec[0];
        }
    }
    return false;
}

function findFirstTruthy<T>(array: T[], callback: (mixed: T, index: number) => boolean | any, thisContext?: any): { callbackReturn: any, value: T | null } {
    let i = 0;
    {
        for (const value of array) {
            const callbackReturn = Function.prototype.call.call(callback, thisContext, value, i++);
            if (callbackReturn) return { callbackReturn, value };
        }
    }
    const callbackReturn = null, value = null;
    return { callbackReturn, value };
}

export default Devvit;
