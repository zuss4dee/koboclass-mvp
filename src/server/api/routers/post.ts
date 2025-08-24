import { z } from "zod";

import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";

export const postRouter = createTRPCRouter({
	hello: publicProcedure
		.input(z.object({ text: z.string() }))
		.query(({ input }) => {
			return {
				greeting: `Hello ${input.text}`,
			};
		}),

	// Apply to become a host
	applyToBeHost: protectedProcedure
		.mutation(async ({ ctx }) => {
			return ctx.db.hostApplication.create({
				data: {
					userId: ctx.session.user.id,
					status: "PENDING",
				},
			});
		}),

	// Create a new class (for hosts)
	createClass: protectedProcedure
		.input(z.object({ 
			title: z.string().min(1),
			description: z.string().min(1),
			price: z.number().positive(),
		}))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.class.create({
				data: {
					title: input.title,
					description: input.description,
					price: input.price,
					hostId: ctx.session.user.id,
					status: "PENDING",
				},
			});
		}),

	// Get user's host application status
	getHostApplicationStatus: protectedProcedure.query(async ({ ctx }) => {
		const application = await ctx.db.hostApplication.findUnique({
			where: { userId: ctx.session.user.id },
		});
		return application;
	}),

	// Get user's classes
	getUserClasses: protectedProcedure.query(async ({ ctx }) => {
		const classes = await ctx.db.class.findMany({
			where: { hostId: ctx.session.user.id },
			orderBy: { createdAt: "desc" },
		});
		return classes;
	}),

	getSecretMessage: protectedProcedure.query(() => {
		return "you can now see this secret message!";
	}),
});
