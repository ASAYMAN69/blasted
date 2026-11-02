<?xml version="1.0" encoding="UTF-8"?>
<hackathon>
    <name>Vultr: Agent Rush Hackathon</name>
    <organizer>lablab.ai</organizer>
    <sponsor>Vultr</sponsor>

    <overview>
        <tagline>
            Build AI agents that do real work — safely sandboxed on Vultr.
        </tagline>
        <format>Hybrid</format>
        <online_phase>
            <start>2026-11-03</start>
            <end>2026-11-08</end>
        </online_phase>
        <onsite_phase>
            <date>2026-11-08</date>
            <venue>Pierpont Place</venue>
            <address>163 W Pierpont Ave, Salt Lake City, UT 84101, USA</address>
            <travel_accommodation_covered>false</travel_accommodation_covered>
        </onsite_phase>
        <total_prizes currency="USD">15000</total_prizes>
    </overview>

    <core_objective>
        Build a web-based AI agent that performs real work through
        code execution or browser automation.

        All agent actions must execute inside isolated sandboxes
        running on Vultr infrastructure.

        The application must act as a centralized control layer
        that plans tasks, dispatches execution, and returns
        verifiable results.

        The solution must demonstrate multi-step agentic workflows,
        actual execution rather than simulated descriptions,
        and a production-style web application.
    </core_objective>

    <challenges>

        <challenge id="1" name="Blast Radius Zero">
            <description>
                Build a web-based agent that performs real work
                through code execution or browser automation,
                with every action contained inside an isolated
                sandbox running on Vultr.
            </description>

            <best_suited_for>
                <item>Code execution</item>
                <item>Browser automation</item>
                <item>Autonomous agents</item>
                <item>Sandboxing</item>
                <item>Execution verification</item>
                <item>AI safety</item>
            </best_suited_for>

            <required_technology>
                <item>Vultr Cloud Compute VM backend</item>
                <item>Web application deployed on Vultr</item>
                <item>Vultr Serverless Inference</item>
                <item>Isolated sandbox execution environment</item>
            </required_technology>

            <execution_patterns>

                <pattern id="A" name="Sandboxed Code Execution">
                    <workflow>
                        <step>User submits a task.</step>
                        <step>AI model generates code.</step>
                        <step>Code executes inside an isolated container.</step>
                        <step>Real execution output is returned.</step>
                        <step>AI model explains the result.</step>
                        <step>
                            Errors may be fed back to the model
                            for additional execution attempts.
                        </step>
                    </workflow>
                </pattern>

                <pattern id="B" name="Sandboxed Browser Use">
                    <workflow>
                        <step>User provides a goal.</step>
                        <step>AI plans the browser actions.</step>
                        <step>Playwright executes inside a container.</step>
                        <step>Screenshots are captured.</step>
                        <step>Vision model verifies the results.</step>
                        <step>Human approval is required before final actions.</step>
                    </workflow>
                </pattern>

            </execution_patterns>

            <example_project_directions>
                <item>CSV Analyst</item>
                <item>Prove-It Code Reviewer</item>
                <item>Chart Anything</item>
                <item>File Fixer</item>
                <item>Self-Healing Runner</item>
                <item>Comparison Shopper</item>
                <item>Form Filler</item>
                <item>Site QA Sweep</item>
                <item>Research with Receipts</item>
                <item>Page Watcher</item>
            </example_project_directions>

            <containment_requirements>
                <requirement>
                    <name>Process Isolation</name>
                    <description>
                        Execution must never access the host
                        machine or application runtime.
                    </description>
                </requirement>

                <requirement>
                    <name>Secret Hygiene</name>
                    <description>
                        API keys and credentials must never
                        be placed inside the sandbox.
                    </description>
                </requirement>

                <requirement>
                    <name>Resource Limits</name>
                    <description>
                        Every execution must have time and
                        memory restrictions.
                    </description>
                </requirement>

                <requirement>
                    <name>Lifecycle Discipline</name>
                    <description>
                        Sandbox environments must be reset
                        or destroyed after each task.
                    </description>
                </requirement>
            </containment_requirements>

            <recommended_sandbox_technologies>
                <item>Docker</item>
                <item>OpenSandbox</item>
                <item>gVisor</item>
                <item>E2B Sandboxes</item>
                <item>Microsandbox</item>
            </recommended_sandbox_technologies>

            <submission_requirements>
                <item>GitHub repository with setup documentation</item>
                <item>Vultr VM backend deployment</item>
                <item>Public demo URL</item>
                <item>Recorded demo video</item>
                <item>Architecture and use-case explanation</item>
                <item>
                    At least one containment moment demonstrated
                    in the demo video.
                </item>
            </submission_requirements>
        </challenge>

        <challenge id="2" name="Powering the Future of Work">
            <description>
                Build and deploy an enterprise-focused AI solution
                that coordinates realistic multi-step workflows
                and improves how teams operate.
            </description>

            <best_suited_for>
                <item>Sales Operations</item>
                <item>Finance and Accounting</item>
                <item>Human Resources</item>
                <item>Customer Support</item>
                <item>Procurement</item>
                <item>Workflow Automation</item>
            </best_suited_for>

            <required_technology>
                <item>Vultr Cloud Compute VM backend</item>
                <item>Web application deployed on Vultr</item>
            </required_technology>

            <optional_technology>
                <item>Vultr Serverless Inference</item>
            </optional_technology>

            <focus_areas>

                <area name="Sales Operations">
                    <workflow>
                        <item>Qualify leads</item>
                        <item>Research prospects</item>
                        <item>Update CRM</item>
                        <item>Draft outreach</item>
                        <item>Follow up with prospects</item>
                    </workflow>
                </area>

                <area name="Finance and Accounting">
                    <workflow>
                        <item>Process invoices</item>
                        <item>Reconcile transactions</item>
                        <item>Flag anomalies</item>
                        <item>Manage payment follow-ups</item>
                    </workflow>
                </area>

                <area name="HR and Recruitment">
                    <workflow>
                        <item>Screen candidates</item>
                        <item>Schedule interviews</item>
                        <item>Coordinate onboarding</item>
                        <item>Track employee workflows</item>
                    </workflow>
                </area>

                <area name="Customer Support">
                    <workflow>
                        <item>Resolve support tickets</item>
                        <item>Investigate issues</item>
                        <item>Take actions across systems</item>
                        <item>Escalate when human input is required</item>
                    </workflow>
                </area>

                <area name="Procurement">
                    <workflow>
                        <item>Monitor purchasing needs</item>
                        <item>Compare vendors</item>
                        <item>Request quotes</item>
                        <item>Track orders</item>
                        <item>Follow up on delays</item>
                    </workflow>
                </area>

            </focus_areas>

            <product_expectations>
                <item>Accessible through a public web browser</item>
                <item>Production-style product experience</item>
                <item>Clear user workflows</item>
                <item>Vultr as the central backend</item>
                <item>Realistic multi-step workflows</item>
                <item>Platform-oriented architecture</item>
            </product_expectations>

            <submission_requirements>
                <item>GitHub repository with setup documentation</item>
                <item>Vultr VM backend deployment</item>
                <item>Public demo URL</item>
                <item>Recorded demo video</item>
                <item>Architecture and use-case explanation</item>
            </submission_requirements>
        </challenge>

    </challenges>

    <technology_requirements>
        <vultr_cloud_compute>
            <required>true</required>
            <description>
                Both challenges require a Vultr VM backend.
                The web application must also be deployed on Vultr.
                Vultr must serve as the central control and
                orchestration infrastructure.
            </description>
        </vultr_cloud_compute>

        <vultr_serverless_inference>
            <endpoint>https://api.vultrinference.com/v1</endpoint>
            <api_compatibility>OpenAI-compatible</api_compatibility>
            <challenge_1>Required</challenge_1>
            <challenge_2>Optional</challenge_2>
            <description>
                Used for agent LLM calls in Challenge 1.
            </description>
        </vultr_serverless_inference>

        <vultr_gpus>
            <available>false</available>
            <description>
                Vultr GPUs are not available for this event.
            </description>
        </vultr_gpus>

        <vultr_api>
            <required>false</required>
            <description>
                Challenge 1 may use the Vultr API to provision
                temporary execution instances.
            </description>
        </vultr_api>

        <deployment_helpers>
            <item>Supabase on Vultr</item>
            <item>Coolify on Vultr</item>
        </deployment_helpers>

    </technology_requirements>

    <credits>
        <amount currency="USD">200</amount>
        <allocation>Per participant</allocation>

        <eligible_services>
            <item>Vultr Compute Instances</item>
            <item>Managed Databases</item>
            <item>Kubernetes Clusters</item>
            <item>Other Vultr services</item>
        </eligible_services>

        <claim_process>
            <step>
                Create a Vultr account using an email address
                not previously associated with Vultr.
            </step>
            <step>Verify the email address.</step>
            <step>
                Access the hackathon promotion page in Billing.
            </step>
            <step>
                Enter the gift code provided at kickoff.
            </step>
            <step>
                Apply the gift code and verify that
                Remaining Credit displays 200 USD.
            </step>
        </claim_process>

        <post_hackathon>
            A payment method must be added to continue
            using deployments after hackathon credits.
        </post_hackathon>
    </credits>

    <judging_criteria>
        <criterion name="Application of Technology">
            Effectiveness of model integration and
            application of the selected technologies.
        </criterion>

        <criterion name="Presentation">
            Clarity and effectiveness of the project presentation.
        </criterion>

        <criterion name="Business Value">
            Practical impact and relevance to real business problems.
        </criterion>

        <criterion name="Originality">
            Uniqueness, creativity, and demonstrated capabilities.
        </criterion>
    </judging_criteria>

    <prizes currency="USD">
        <total_cash>9000</total_cash>
        <total_vultr_credits>5000</total_vultr_credits>

        <placement rank="1">
            <cash>5000</cash>
            <vultr_credits>3000</vultr_credits>
        </placement>

        <placement rank="2">
            <cash>3000</cash>
            <vultr_credits>1000</vultr_credits>
        </placement>

        <placement rank="3">
            <cash>1000</cash>
            <vultr_credits>1000</vultr_credits>
        </placement>

        <onsite_raffle>
            <additional_value>1000</additional_value>
            <individual_winners>3</individual_winners>
            <prizes>
                <item>PlayStation 5 Standard</item>
                <item>Apple AirPods 5 with Wireless Charging Case</item>
                <item>Razer DeathAdder V3 HyperSpeed</item>
            </prizes>
        </onsite_raffle>
    </prizes>

    <schedule timezone="Asia/Dhaka">
        <event>
            <name>Hackathon Kick-off</name>
            <datetime>2026-11-03T22:00:00+06:00</datetime>
        </event>

        <event>
            <name>Discord Q&A Session</name>
            <datetime>2026-11-03T23:00:00+06:00</datetime>
        </event>

        <event>
            <name>On-site Doors Open</name>
            <datetime>2026-11-08T22:00:00+06:00</datetime>
        </event>

        <event>
            <name>Welcome Remarks</name>
            <datetime>2026-11-08T22:30:00+06:00</datetime>
        </event>

        <event>
            <name>Submission Deadline</name>
            <datetime>2026-11-09T05:00:00+06:00</datetime>
        </event>

        <event>
            <name>On-site Doors Close</name>
            <datetime>2026-11-09T07:00:00+06:00</datetime>
        </event>
    </schedule>

    <submission>
        <platform>lablab.ai</platform>
        <mandatory>true</mandatory>

        <required_materials>
            <item>Project title</item>
            <item>Short description</item>
            <item>Long description</item>
            <item>Technology tags</item>
            <item>Category tags</item>
            <item>Cover image</item>
            <item>Video presentation</item>
            <item>Slide presentation</item>
            <item>Public GitHub repository</item>
            <item>Public application URL</item>
            <item>Vultr infrastructure documentation</item>
        </required_materials>

        <readme_requirements>
            <item>Explain the Vultr services used.</item>
            <item>Document backend and deployment architecture.</item>
            <item>Explain how Vultr powers the solution.</item>
            <item>Explain the agent's use case.</item>
            <item>Explain how the agent executes real tasks.</item>
            <item>
                For Challenge 1, demonstrate a containment moment
                in the recorded demo.
            </item>
        </readme_requirements>

        <optional_showcase>
            <platform>Vultr Community</platform>
            <replaces_official_submission>false</replaces_official_submission>
        </optional_showcase>
    </submission>

    <team_requirements>
        <minimum_members>1</minimum_members>
        <maximum_members>6</maximum_members>
        <team_formation>
            Participants may work individually or form teams.
        </team_formation>
    </team_requirements>

</hackathon>
