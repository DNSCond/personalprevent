// developers.reddit.com
import { UserV2 } from '@devvit/protos/types/devvit/reddit/v2alpha/userv2.js';
import { Devvit, Post, TriggerContext, Comment } from '@devvit/public-api';
import { normalize_newlines } from 'anthelpers';
import { words } from './words_alpha.js';

type theFilters = 'age' | 'english';
const defaultFilters: theFilters[] = ['age'];
const availableFilters: { label: string, value: theFilters }[] = [
  { label: 'self age statement', value: 'age' },
  { label: 'english', value: 'english' },];
Devvit.configure({ redditAPI: true, });

Devvit.addSettings([
  {
    type: 'select', name: 'filters',
    label: 'which filters to apply',
    options: availableFilters,
    defaultValue: defaultFilters,
    multiSelect: true,
  },
  // {
  //   type: 'select', name: 'action',
  //   label: 'what to do with guilty',
  //   options: [
  //     { label: 'ban user', value: 'banUser' },
  //     { label: 'remove comment or post', value: 'remove' },
  //     { label: 'report (or modmail if remove is chosen)', value: 'report' },
  //   ],
  //   defaultValue: ['report'],
  //   multiSelect: true,
  // },
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

async function onThingUpdate(body: string, _user: UserV2, context: TriggerContext, item: Post | Comment) {
  const actions: theFilters[] = (await context.settings.get('filters')) ?? defaultFilters;
  const subredditName = await context.reddit.getCurrentSubredditName();//, username = user.name;
  if (!subredditName) return;
  if (actions.includes('age')) {
    const isAgeGuilty = validateAgeStringText(body);
    if (isAgeGuilty) {
      //, actions: string[] = (await context.settings.get('action')) ?? [];
      // if (actions.includes('banUser')) {context.reddit.banUser({context: item.id, subredditName, username,
      // message: 'you have been banned for stating your age\n\nnote: i may be incorrect because im a bot'
      // });} if (actions.includes('remove')) item.remove(); else if (actions.includes('report'))
      await context.reddit.report(item, { reason: `this user might state their age (${context.appVersion}) {{${isAgeGuilty}}}`, });
    }
  }
  if (actions.includes('english')) {
    const isEnglishGuilty = validateEnglishStringText(body, 85n);
    if (isEnglishGuilty.isViolation) {
      //appears to be mostly non-English or gibberish (less than 85% recognized English words).
      // await context.reddit.report(item, { reason: `out of the ${isEnglishGuilty.total} words, ${isEnglishGuilty.inThere}`, });
    }
  }
}

// Devvit.addMenuItem({
//     location: 'comment',
//     label: 'checkComment',
//     forUserType: 'moderator',
//     async onPress(event, context: Devvit.Context) {
//         const currentUser = await context.reddit.getCurrentUsername();
//         // if (currentUser === undefined) return context.ui.showToast(`there is no currentUser`);
//         const subredditId = (await context.reddit.getCurrentSubreddit()).id,
//             subject = `u/${currentUser} made me check a comment`,
//             comment = await context.reddit.getCommentById(event.targetId);
//         let bodyMarkdown = `u/${currentUser} made me check [comment](${comment.url})`,
//             { body } = comment, filtertext = body.replace(/!\[(?:img|gif)]\([a-z0-9]+\)/gi, '')
//                 .toLowerCase().trim().replace(/[^a-z0-9]/g, '');
//         bodyMarkdown += `\n\n${quoteMarkdown(indent_codeblock(filtertext))}`;
//         bodyMarkdown += `\n\n---\n\n${quoteMarkdown(indent_codeblock(body))}`;
//         await context.reddit.modMail.createModNotification({
//             subject, bodyMarkdown, subredditId,
//         });
//       context.ui.showToast({ text: `Done, check the modmail` });
//     },
// });

Devvit.addMenuItem({
  location: 'subreddit',
  label: 'check String',
  forUserType: 'moderator',
  description: 'Test the Filter',
  async onPress(_event, context: Devvit.Context) {
    context.ui.showForm(checkString);
    // const currentUser = await context.reddit.getCurrentUsername();
    // if (currentUser === undefined) return context.ui.showToast(`there is no currentUser`);
  },
});

const checkString = Devvit.createForm(
  {
    fields: [
      {
        type: 'paragraph',
        name: 'testString',
        label: 'test string',
        required: true,
      },
      {
        type: 'select', name: 'filters',
        label: 'which filters to apply',
        options: availableFilters,
        defaultValue: defaultFilters,
        multiSelect: false,
      },
    ],
    title: 'Test the Filter',
    acceptLabel: 'Test',
  },
  async function (event, context: Devvit.Context) {
    const { testString } = event.values;
    if (event.values.filters.length > 1) {
      return context.ui.showToast(`choose only 1 filter`);
    }
    switch (event.values.filters[0] as theFilters) {
      case 'english':
        await manual_English(testString, context);
        break;
      case 'age':
        await manual_testString(testString, context);
        break;
      default:
    }
  }
);

Devvit.addMenuItem({
  location: 'comment',
  label: 'checkComment for age',
  forUserType: 'moderator',
  async onPress(event, context: Devvit.Context) {
    // const currentUser = await context.reddit.getCurrentUsername();
    // if (currentUser === undefined) return context.ui.showToast(`there is no currentUser`);
    const comment = await context.reddit.getCommentById(event.targetId);
    await manual_testString(comment.body, context);
  },
});

Devvit.addMenuItem({
  location: 'comment',
  label: 'checkComment for english',
  forUserType: 'moderator',
  async onPress(event, context: Devvit.Context) {
    const comment = await context.reddit.getCommentById(event.targetId);
    await manual_English(comment.body, context);
  },
});

async function manual_testString(body: string, context: Devvit.Context) {
  const isGuilty = validateAgeStringText(body), appV = context.appVersion;
  if (isGuilty) {
    context.ui.showToast(`a match is made {{${isGuilty}}} and would be reported (${appV})`);
  } else context.ui.showToast(`no match is made (${context.appVersion})`);
}

async function manual_English(body: string, context: Devvit.Context) {
  const isEnglishGuilty = validateEnglishStringText(body, 85n);
  context.ui.showToast(`out of the ${isEnglishGuilty.total} words, ${isEnglishGuilty.inThere} were found in the dictionary and ${isEnglishGuilty.outThere} were not`);
}

function validateAgeStringText(body: string): string | boolean {
  const numberWords = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    twentyone: 21, twentytwo: 22, twentythree: 23, twentyfour: 24,
    twentyfive: 25, thirty: 30, forty: 40, fifty: 50, sixty: 60,
    seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  }, text = normalize_newlines(body)
    .replace(/^https:\/\/preview.redd.it\/.+$/gim, '')
    .replace(/!\[(?:img|gif)]\([a-z0-9]+\)/gi, '')
    .toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const comparisons = [
    /i(?:am|m)?a?minor/,
    /turn(?:ed|ing)\d{1,2}/,
    /i(?:am|m)?under\d{1,2}/,
    /i(?:am|m)(?:a|like)?\d{1,2}/,
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
      const exec = RegExp(regex.source.replace('\\d{1,2}',
        word.replace('y', '(?:y|ies?)')), regex.flags).exec(text);
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

/**
 * note words has to be a Set<string>
 * @param body the string to check
 * @param threshold a bigint from 0 to 1000, the percent of valid words vs all words
 * @returns 
 */
function validateEnglishStringText(body: string, threshold: bigint): { isViolation: boolean, inThere: number, outThere: number, total: number, ratio: number } {
  let inThere = 0, outThere = 0;
  //for (const element of remove(String(body).toLowerCase(), /[~!@#$%^&*(')\-=_+{}\[\]\/\\":;<>,.`]+/ig).split(/\s+/g)) {
      for (const element of String(body).toLowerCase().split(/\s+/g)) {
    // words: string[]; an array of all valid words
    if (words.has(element)) {
      ++inThere;
    } else {
      outThere++
    }
  }
  const ratio: number = ((inThere / (inThere + outThere)) * 1000);
  if (ratio !== ratio) throw new RangeError('there are no words in body')
  // if truty a violation has occured
  const isViolation = ratio < threshold;
  return { isViolation, inThere, outThere, total: inThere + outThere, ratio };
}

function remove(string: string, regex: RegExp) {
  return string.replace(regex, '');
}

export default Devvit;
