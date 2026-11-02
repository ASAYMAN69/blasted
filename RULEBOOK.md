<?xml version="1.0" encoding="UTF-8"?>
<hackathon_rules>
    <introduction>
        <title>lablab.ai Hackathon Rules</title>
        <description>
            Participants must follow all hackathon rules and submission
            requirements. Non-compliance may result in lower scores
            or disqualification.
        </description>
        <priority>
            The event-specific submission form and event page take
            priority over standard submission guidelines.
        </priority>
    </introduction>

    <submission_guidelines>
        <adherence>
            Failure to follow submission guidelines may result in
            reduced scores or exclusion from the hackathon.
        </adherence>

        <basic_information>
            <project_title>
                Must be clear and descriptive.
            </project_title>
            <short_description>
                Must follow the character limit specified in the form.
            </short_description>
            <long_description>
                Must follow the character limit specified in the form.
            </long_description>
            <technology_tags>
                Must accurately represent the technologies used.
            </technology_tags>
            <category_tags>
                Must accurately categorize the project.
            </category_tags>
        </basic_information>

        <cover_and_presentation>
            <cover_image>
                <required>false</required>
                <aspect_ratio>16:9</aspect_ratio>
            </cover_image>
            <video_presentation>
                <required>true</required>
                <formats>
                    <format>MP4</format>
                    <format>MOV</format>
                </formats>
            </video_presentation>
            <slide_presentation>
                <required>true</required>
                <format>PDF</format>
            </slide_presentation>
        </cover_and_presentation>

        <application_components>
            <github_repository>
                <required>true</required>
                <visibility>Public</visibility>
                <purpose>
                    Allow judges to review the source code.
                </purpose>
            </github_repository>

            <demo_application_platform>
                <required>true</required>
                <description>
                    Specify where the application is hosted.
                </description>
                <examples>
                    <item>Streamlit</item>
                    <item>Replit</item>
                    <item>Vercel</item>
                </examples>
            </demo_application_platform>

            <application_url>
                <required>true</required>
                <purpose>
                    Allow judges to interactively evaluate the application.
                </purpose>
            </application_url>
        </application_components>
    </submission_guidelines>

    <judging_criteria>
        <criterion name="Application">
            <evaluation>
                <item>Demo application link works correctly.</item>
                <item>All features are demonstrated in the video.</item>
                <item>Features and functionalities work smoothly.</item>
                <item>GitHub source code is accessible.</item>
                <item>Code is well-structured and thoughtfully implemented.</item>
            </evaluation>

            <scoring>
                <score value="5" label="Excellent">
                    Exceptional application of AI technology through
                    the demo, video, and GitHub repository.
                    Technical implementation is flawless and exceeds
                    expectations.
                </score>
            </scoring>
        </criterion>

        <criterion name="Originality">
            <scoring>
                <score value="1" label="Not Original">
                    Exact copy of existing solutions without
                    novel approaches.
                </score>

                <score value="2" label="Limited Originality">
                    Common idea with little or no differentiation
                    from existing solutions.
                </score>

                <score value="3" label="Moderately Original">
                    Contains a unique idea or approach that
                    distinguishes it from existing non-AI solutions,
                    such as reducing cost or time.
                </score>

                <score value="4" label="Highly Original">
                    Unique perspective or innovative approach
                    using unconventional methods, creative
                    combinations, or novel applications.
                </score>

                <score value="5" label="Exceptionally Original">
                    Transformative and unprecedented approach
                    with potential to disrupt an industry
                    or fundamentally solve a problem differently.
                </score>
            </scoring>
        </criterion>
    </judging_criteria>

    <deadline_and_technical_issues>
        <submission_deadline>
            The deadline is specified on the event page.
        </submission_deadline>

        <grace_period>
            5 minutes after the official deadline.
        </grace_period>

        <technical_problems>
            If technical issues prevent submission:
            <requirement>
                Contact the organizers before the deadline.
            </requirement>
            <extension_policy>
                Only organizers can grant a deadline extension
                to an affected team.
            </extension_policy>
        </technical_problems>
    </deadline_and_technical_issues>

    <ethical_conduct>
        <disqualification_grounds>
            <item>Plagiarism</item>
            <item>Manipulating the voting system</item>
            <item>Cheating</item>
            <item>Tampering with systems</item>
            <item>Using unauthorized automation</item>
            <item>Fraudulent behaviour</item>
            <item>Actions undermining hackathon fairness</item>
            <item>
                Other conduct determined by lablab.ai or its
                event partners to justify disqualification.
            </item>
        </disqualification_grounds>

        <consequences>
            Participants may be removed from the event
            or immediately disqualified.
        </consequences>
    </ethical_conduct>

    <mentor_and_organizer_participation>
        <organizers>
            <participation_allowed>true</participation_allowed>
            <prize_eligibility>false</prize_eligibility>
        </organizers>

        <mentors>
            <participation_allowed>true</participation_allowed>
            <judge_eligibility_when_participating>false</judge_eligibility_when_participating>
        </mentors>
    </mentor_and_organizer_participation>

    <judges_code_of_conduct>
        <principle>
            <name>Confidentiality</name>
            <requirement>
                Maintain confidentiality of all submissions.
            </requirement>
        </principle>

        <principle>
            <name>Conflict of Interest</name>
            <requirement>
                Abstain from judging when a conflict of interest exists.
            </requirement>
        </principle>

        <principle>
            <name>Disclosure</name>
            <requirement>
                Declare affiliations that may compromise impartiality.
            </requirement>
        </principle>

        <principle>
            <name>Intellectual Property</name>
            <requirement>
                Do not copy, retain, or share submitted materials.
            </requirement>
        </principle>
    </judges_code_of_conduct>

</hackathon_rules>
