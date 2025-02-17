// @ts-ignore
import type { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { prisma } from '../_client.js';
import { SurveyPayloadSchema } from '../../prisma/zod/schemas/index.js';

export async function getSurveyPrompt(
  surveyId: string
): Promise<ChatCompletionMessageParam[]> {
  const limit = 100;
  const info = await prisma.survey.findUnique({
    where: {
      id: surveyId,
    },
    select: {
      name: true,
      payload: true,
    },
  });
  const result = await prisma.surveyResult.findMany({
    where: {
      surveyId,
    },
    take: limit,
    select: {
      sessionId: true,
      payload: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return [
    {
      role: 'system',
      content: `You are an analysis assistant for a questionnaire survey. You need to generate corresponding answers based on existing data and user questions. Please try to answer in the user's language.

The results of the questionnaire are in JSON format and are stored in the payload field. The description of the field is as follows:
${SurveyPayloadSchema.parse(info?.payload)
  .items.map((item) => `- ${item.name}: ${item.label}`)
  .join('\n')}

Here are the most recent ${limit} survey results:

${result.map((item) => JSON.stringify(item)).join('\n')}
        `,
    },
  ];
}

export const basicSurveyClassifyPromptToken = 101;

export function buildSurveyClassifyPrompt(
  data: {
    id: string;
    content: any;
  }[],
  suggestionCategory: string[],
  language: string = 'en'
): string {
  return `
You are a content data analysis and classification expert. You need to make a simple classification based on the information collected from users in multiple languages ​​around the world, and return the classified json directly to me.

The data is as follows:
${data.map((obj) => `- ${JSON.stringify(obj)}`).join('\n')}

The classification results of the example are as follows:
{"id1": "some category which summary", "id2": "another category which summary"}

The existing categories are as follows. Please refer to the existing categories as much as possible:
${JSON.stringify(suggestionCategory)}

No explanation is required.

${language !== 'en' ? `And response result should use \`${language}\` as response language.` : ''}
`.trim();
}
