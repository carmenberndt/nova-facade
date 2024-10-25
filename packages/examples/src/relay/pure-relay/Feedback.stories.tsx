import { graphql } from "react-relay";
import {
  getNovaDecorator,
  getNovaEnvironmentForStory,
  type WithNovaEnvironment,
  EventingProvider,
  getOperationName,
  getOperationType,
  type StoryObjWithoutFragmentRefs,
} from "@nova/react-test-utils/relay";
import { MockPayloadGenerator } from "relay-test-utils";
import type { Meta } from "@storybook/react";
import { userEvent, waitFor, within, expect } from "@storybook/test";
import type { TypeMap } from "../../__generated__/schema.all.interface";
import { FeedbackComponent } from "./Feedback";
import type { FeedbackStoryRelayQuery } from "./__generated__/FeedbackStoryRelayQuery.graphql";
import { getSchema } from "../../testing-utils/getSchema";
import * as React from "react";
import type { events } from "../../events/events";
import { RecordSource, Store } from "relay-runtime";

const schema = getSchema();

const novaDecorator = getNovaDecorator(schema, {
  getEnvironmentOptions: () => ({
    store: new Store(new RecordSource()),
  }),
  // We add this to verify scenario of using relay's MockPayloadGenerator
  generateFunction: (operation, mockResolvers) => {
    const result = MockPayloadGenerator.generateWithDefer(
      operation,
      mockResolvers ?? null,
      {
        mockClientData: true,
        generateDeferredPayload: true,
      },
    );

    return result;
  },
});

const meta = {
  component: FeedbackComponent,
  decorators: [novaDecorator],
  parameters: {
    novaEnvironment: {
      query: graphql`
        query FeedbackStoryRelayQuery($id: ID!) @relay_test_operation {
          feedback(id: $id) {
            ...Feedback_feedbackRelayFragment
          }
          viewData {
            ...Feedback_viewDataRelayFragment
          }
        }
      `,
      variables: { id: "42" },
      referenceEntries: {
        feedback: (data) => data?.feedback,
        viewData: (data) => data?.viewData,
      },
      resolvers: {
        ViewData: () => ({
          viewDataField: "View data field",
        }),
      },
    },
  } satisfies WithNovaEnvironment<FeedbackStoryRelayQuery, TypeMap>,
} satisfies Meta<typeof FeedbackComponent>;

export default meta;
type Story = StoryObjWithoutFragmentRefs<typeof meta>;

export const AutoGeneratedDataOnly: Story = {};

export const Primary: Story = {
  parameters: {
    novaEnvironment: {
      resolvers: {
        Feedback: () => sampleFeedback,
      },
    },
  } satisfies WithNovaEnvironment<FeedbackStoryRelayQuery, TypeMap>,
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
  } satisfies WithNovaEnvironment<FeedbackStoryRelayQuery, TypeMap>,
};

const likeResolvers = {
  Feedback: () => sampleFeedback,
  FeedbackLikeMutationResult: () => ({
    feedback: {
      ...sampleFeedback,
      doesViewerLike: true,
    },
  }),
};

export const Like: Story = {
  parameters: {
    novaEnvironment: {
      resolvers: likeResolvers,
    },
  } satisfies WithNovaEnvironment<FeedbackStoryRelayQuery, TypeMap>,
  play: async (context) => {
    const container = within(context.canvasElement);
    const likeButton = await container.findByRole("button", { name: "Like" });
    await userEvent.click(likeButton);

    const {
      graphql: { mock },
    } = getNovaEnvironmentForStory(context);

    await waitFor(async () => {
      const operation = mock.getMostRecentOperation();
      await expect(operation).toBeDefined();
    });
    mock.resolveMostRecentOperation((operation) => {
      return MockPayloadGenerator.generate(operation, likeResolvers);
    });
  },
};

export const ArtificialFailureToShowcaseDecoratorBehaviorInCaseOfADevCausedError: Story =
  {
    parameters: {
      novaEnvironment: {
        enableQueuedMockResolvers: false,
      },
    } satisfies WithNovaEnvironment<FeedbackStoryRelayQuery, TypeMap>,
    play: async (context) => {
      const {
        graphql: { mock },
      } = getNovaEnvironmentForStory(context);
      await waitFor(async () => {
        const operation = mock.getMostRecentOperation();
        await expect(operation).toBeDefined();
      });
      mock.rejectMostRecentOperation(new Error("Query failed"));
    },
  };

export const LikeFailure: Story = {
  parameters: {
    novaEnvironment: {
      enableQueuedMockResolvers: false,
    },
  } satisfies WithNovaEnvironment<FeedbackStoryRelayQuery, TypeMap>,
  play: async (context) => {
    const container = within(context.canvasElement);
    const {
      graphql: { mock },
    } = getNovaEnvironmentForStory(context);

    await waitFor(async () => {
      const operation = mock.getMostRecentOperation();
      await expect(operation).toBeDefined();
    });
    const operation = mock.getMostRecentOperation();
    const operationName = getOperationName(operation);
    const operationType = getOperationType(operation);
    expect(operationName).toEqual("FeedbackStoryRelayQuery");
    expect(operationType).toEqual("query");
    mock.resolveMostRecentOperation((operation) => {
      return MockPayloadGenerator.generate(
        operation,
        {
          Feedback: () => sampleFeedback,
        },
        { mockClientData: true },
      );
    });
    const likeButton = await container.findByRole("button", { name: "Like" });
    userEvent.click(likeButton);
    await waitFor(async () => {
      const operation = mock.getMostRecentOperation();
      expect(operation).toBeDefined();
    });
    const nextOperation = mock.getMostRecentOperation();
    const nextOperationName = getOperationName(nextOperation);
    const nextOperationType = getOperationType(nextOperation);
    expect(nextOperationName).toEqual("FeedbackComponent_RelayLikeMutation");
    expect(nextOperationType).toEqual("mutation");
    mock.rejectMostRecentOperation(new Error("Like failed"));
    await container.findByText("Something went wrong");
  },
};

const FeedbackWithDeleteDialog = (
  props: React.ComponentProps<typeof FeedbackComponent>,
) => {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  return (
    <EventingProvider<typeof events>
      eventMap={{
        onDeleteFeedback: (eventWrapper) => {
          setOpen(true);
          setText(eventWrapper.event.data().feedbackText);
          return Promise.resolve();
        },
      }}
    >
      <FeedbackComponent {...props} />
      <dialog open={open}>
        <button onClick={() => setOpen(false)}>Cancel</button>
        Are you sure you want to delete feedback "{text}"
      </dialog>
    </EventingProvider>
  );
};

export const WithDeleteDialog: Story = {
  ...Primary,
  render: (args) => <FeedbackWithDeleteDialog {...args} />,
  play: async (context) => {
    const container = within(context.canvasElement);
    const deleteButton = await container.findByRole("button", {
      name: "Delete feedback",
    });
    await userEvent.click(deleteButton);
    const dialog = await container.findByRole("dialog");
    await expect(dialog).toBeInTheDocument();
  },
};

const sampleFeedback = {
  id: "42",
  message: {
    text: "Feedback title",
  },
  doesViewerLike: false,
};
