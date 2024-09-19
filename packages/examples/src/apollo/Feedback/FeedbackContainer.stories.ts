import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within, waitFor, expect } from "@storybook/test";
import {
  type UnknownOperation,
  type WithNovaEnvironment,
  getNovaDecorator,
  MockPayloadGenerator,
  getNovaEnvironmentForStory,
} from "@nova/react-test-utils/apollo";
import { getSchema } from "../../testing-utils/getSchema";
import type { TypeMap } from "../../__generated__/schema.all.interface";
import { FeedbackContainer } from "./FeedbackContainer";

const schema = getSchema();

const meta = {
  component: FeedbackContainer,
  decorators: [getNovaDecorator(schema)],
} satisfies Meta<typeof FeedbackContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AutoGeneratedDataOnly: Story = {};

export const Primary: Story = {
  parameters: {
    novaEnvironment: {
      resolvers: {
        Feedback: () => sampleFeedback,
      },
    },
  } satisfies WithNovaEnvironment<UnknownOperation, TypeMap>,
};

export const Liked: Story = {
  parameters: {
    novaEnvironment: {
      resolvers: {
        Feedback: () => ({
          ...sampleFeedback,
          doesViewerLike: true,
        }),
      },
    },
  } satisfies WithNovaEnvironment<UnknownOperation, TypeMap>,
};

export const Like: Story = {
  parameters: {
    novaEnvironment: {
      resolvers: {
        Feedback: () => sampleFeedback,
        FeedbackLikeMutationResult: () => ({
          feedback: {
            ...sampleFeedback,
            doesViewerLike: true,
          },
        }),
      },
    },
  } satisfies WithNovaEnvironment<UnknownOperation, TypeMap>,
  play: async ({ canvasElement }) => {
    const container = within(canvasElement);
    const likeButton = await container.findByRole("button", { name: "Like" });
    userEvent.click(likeButton);
  },
};

export const LikeFailure: Story = {
  parameters: {
    novaEnvironment: {
      enableQueuedMockResolvers: false,
    },
  } satisfies WithNovaEnvironment<UnknownOperation, TypeMap>,
  play: async (context) => {
    const {
      graphql: { mock },
    } = getNovaEnvironmentForStory(context);

    await waitFor(async () => {
      const operation = mock.getMostRecentOperation();
      await expect(operation).toBeDefined();
    });
    await mock.resolveMostRecentOperation((operation) =>
      MockPayloadGenerator.generate(operation, {
        Feedback: () => sampleFeedback,
      }),
    );
    await Like.play?.(context);
    await waitFor(async () => {
      const operation = mock.getMostRecentOperation();
      expect(operation).toBeDefined();
    });
    mock.rejectMostRecentOperation(new Error("Like failed"));
    const container = within(context.canvasElement);
    await container.findByText("Something went wrong");
  },
};

export const QueryFailure: Story = {
  parameters: {
    novaEnvironment: {
      enableQueuedMockResolvers: false,
    },
  } satisfies WithNovaEnvironment<UnknownOperation, TypeMap>,
  play: async (context) => {
    const {
      graphql: { mock },
    } = getNovaEnvironmentForStory(context);
    await waitFor(async () => {
      const operation = mock.getMostRecentOperation();
      await expect(operation).toBeDefined();
    });
    await mock.rejectMostRecentOperation(new Error("Query failed"));
  },
};

export const Loading: Story = {
  parameters: {
    novaEnvironment: {
      enableQueuedMockResolvers: false,
    },
  } satisfies WithNovaEnvironment<UnknownOperation, TypeMap>,
};

const sampleFeedback = {
  id: "42",
  message: {
    text: "Feedback title",
  },
  doesViewerLike: false,
};
