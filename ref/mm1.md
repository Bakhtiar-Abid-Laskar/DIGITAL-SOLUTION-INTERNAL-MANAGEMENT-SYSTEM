Master UI/UX Specification Document: Service Center Management Application
This document provides an exhaustive, pixel-perfect breakdown of the 16-screen service center management application. It is structured to act as a definitive blueprint for an AI IDE agent (like Antigravity) to implement the UI/UX with absolute precision.

🎨 Global Design System & Variables
Before implementing individual screens, configure the global design tokens:

Color Palette:

Primary (Brand): Deep Purple (e.g., #5E35B1 or similar). Used for primary actions, active states, and Receptionist/General branding.

Secondary (Technician): Forest Green (e.g., #2E7D32). Used for Technician-specific branding, success states, and completion actions.

Tertiary (Admin): Deep Blue (e.g., #1565C0). Used for Admin-specific branding.

Status/Alert Colors:

Urgent / Danger: Red (#D32F2F)

High Priority / Warning: Orange (#ED6C02)

Normal / Success: Green (#2E7D32)

Info / Waiting: Light Purple/Blue (#7E57C2)

Backgrounds: * App Background: Pure White (#FFFFFF)

Surface/Card Background: White with subtle drop shadow (e.g., box-shadow: 0 2px 8px rgba(0,0,0,0.05))

Input Fields/Muted Backgrounds: Very Light Gray (#F5F5F5)

Text: Primary text (Dark Gray/Black), Secondary text (Medium Gray).

Typography:

Font Family: Clean, modern Sans-Serif (e.g., Inter, Roboto, or SF Pro).

Hierarchy: Standardized H1 (Welcome banners), H2 (Section titles), Body 1 (Standard text), Body 2 (Subtitles/metadata), Button text (Medium/Bold weight).

Common UI Components:

Bottom Navigation Bar: Contains 4-5 icons with labels. Active state inherits the role's primary color (Purple, Green, or Blue). Includes a Floating Action Button (FAB) nested in the center for primary roles.

Cards: 8px to 12px border radius, white background, subtle shadow.

Pills/Badges: Fully rounded edges, filled with a 10-15% opacity of the semantic color, text colored to match the semantic color.

Inputs: Outline style or light gray fill with bottom border/outline on focus. Asterisk * in red for required fields.

📱 Detailed Screen-by-Screen Breakdown
1. ROLE SELECTION (LOGIN)
Purpose: Initial landing screen for user authentication/routing based on job role.

Header: Centered title "Welcome" (H1, Bold). Subtitle "Please select your role to continue" (Gray text).

Layout: Vertical flex column containing three prominent role cards.

Role Cards (Button-like components):

Styling: White background, thin border/shadow, rounded corners. Layout: Left-aligned icon, vertical text stack.

Card 1 (Receptionist): Light purple rounded square icon box with a purple profile user icon. Title: "Receptionist" (Bold). Subtitle: "Manage customers, jobs and billing".

Card 2 (Technician): Light green rounded square icon box with a green user/gear icon. Title: "Technician" (Bold). Subtitle: "View assigned jobs and update status".

Card 3 (Admin): Light blue rounded square icon box with a blue shield/check icon. Title: "Admin" (Bold). Subtitle: "Manage users, jobs, inventory and reports".

2. RECEPTIONIST DASHBOARD
App Bar: Title "Receptionist" (Left), Outline Bell Icon (Right).

Welcome Banner:

Solid Primary Purple card with a subtle gradient/pattern.

Text (White): "Good Morning, Anjali" (Bold, H2), "Have a productive day!" (Body text).

Right side: Circular profile avatar (Purple background, white user icon).

Quick Actions (Grid Section):

Section Title: "Quick Actions" (Bold).

Grid Layout: 3 columns x 2 rows.

Items (Icon top, Text bottom):

New Job (Cyan circle with '+' icon)

Job List (Orange circle with list icon)

Customers (Purple circle with users icon)

Attendance (Cyan circle with target/location icon)

Notifications (Red circle with bell icon)

Print Receipt (Purple circle with printer icon)

Today's Summary (Grid Section):

Section Title: "Today's Summary" (Bold).

Grid Layout: 2 columns x 2 rows of summary cards.

Card Styling: White card, left-aligned title, bottom-left large number, right-aligned chevron >.

Jobs Received: 12 (Black text)

In Progress: 8 (Black text)

Completed: 5 (Black text)

Urgent: 2 (Red text)

Bottom Navigation:

Items: Home (Active, Purple icon/text), Jobs (Gray outline), Customers (Gray outline), More (Gray grid icon).

Center FAB: Circular, Primary Purple, contains a White '+' icon. Floating above the nav bar.

3. ATTENDANCE (RECEPTIONIST)
App Bar: Back arrow < (Left), Title "Attendance" (Center).

Calendar Strip:

Month/Year Selector: "May 2025 v" (Dropdown style).

Horizontal scrollable date strip. Days of week top, dates bottom.

Active State: "14 Wed" has a solid Purple rounded-rectangle background, white text.

Indicators: Small dots below dates (Green for present, Red for absent/missed).

Status Card:

Left side: "Today, 14 May 2025" (White text on Green background pill).

Right side: "Status" (Gray text), "Present" (Green text, bold).

Selfie Capture Area:

Large square container displaying a live camera feed/captured selfie of the user.

Metadata Row:

Flex row, space-between.

Left: "Time" (Gray), "09:15 AM" (Black).

Right: "Location" (Gray), "12.9716° N, 77.5946° E" (Black).

Primary Action: Solid Green button, full width, text "Take Selfie for Attendance".

Attendance History: Section Title, right-aligned "View All >" (Green text).

Bottom Navigation: Standard Receptionist nav bar (same as Screen 2).

4. CUSTOMER INTAKE FORM
App Bar: Back arrow < (Left), Title "New Job / Customer Intake" (Center).

Form Inputs (Vertical Stack):

Styling: Labels above inputs. Required fields marked with red *. Input boxes have rounded corners, light border.

*Customer Name : Text input. Value: "Ramesh Kumar".

*Contact Number : Text input with a phone icon trailing inside the box. Value: "9876543210".

*Device Type : Dropdown selector (chevron down icon trailing). Value: "Laptop".

*Reported Issue : Text input. Value: "Laptop not turning on".

Remarks (optional): Text area (taller box). Value: "Customer says power light blinks."

Job Type Toggle:

Segmented control (two buttons in a row).

Left: "In-house Job" (Active, solid purple, white text).

Right: "Onsite Job" (Inactive, white background, gray text, light border).

Priority Selector:

Label: "Priority *"

Three button group.

Normal (Gray border/text), High (Gray border/text), Urgent (Active, solid Red background, white text).

Bottom Action (Sticky): Solid Purple button, full width, text "Next".

5. JOB ASSIGNMENT
App Bar: Back arrow < (Left), Title "Assign Job" (Center).

Job Metadata:

"Job ID (Auto)" (Gray text).

"JOB-250S14-0007" (Black text, Bold).

Form Inputs:

*Select Technician : Dropdown. Value: "Rahul Technician".

Priority: Text display. Value: "Urgent" (Red text).

Job Type: Text field (disabled/read-only). Value: "In-house Job".

Customer: Text field (disabled). Value: "Ramesh Kumar".

Device: Text field (disabled). Value: "Laptop".

Issue: Text area (disabled). Value: "Laptop not turning on".

Bottom Actions (Sticky row):

Left Button (40% width): Outline Purple border, Purple text, Printer icon, "Print Receipt".

Right Button (60% width): Solid Purple, White text, "Create Job".

6. JOB TRACKING (RECEPTIONIST)
App Bar: Back arrow < (Left), Title "All Jobs", Search icon, Filter icon, Vertical 3-dot menu.

Tabs (Scrollable horizontal row):

All 25 (Active: Solid Purple pill, white text).

Received 6 (Inactive text).

In Progress 9 (Inactive text).

Completed 7 (Inactive text).

Job Cards List (Vertical scroll):

Card Layout: Thick colored left border indicating priority/status. Top row: ID and Status Pill. Middle: Customer Name, Issue snippet. Bottom: Technician assigned (if any).

Card 1: Red left border. "JOB-250S14-0007". Priority Pill: "Urgent" (Red bg/text). "Ramesh Kumar". "Laptop not turning on". "Rahul Technician". Status Pill: "In Progress" (Orange outline/text).

Card 2: Orange left border. "JOB-250S14-0006". Priority Pill: "High". "Sneha Patel". "Slow performance". Status Pill: "Received" (Blue).

Card 3: Green left border. "JOB-250S14-0005". Priority Pill: "Normal". "Arjun Mehta". "Keyboard not working". Status Pill: "Completed" (Green).

Card 4: Purple left border. "JOB-250S14-0004". Status Pill: "Waiting for Materials" (Purple). "Vikram Singh". "Motherboard issue".

7. NOTIFICATIONS
App Bar: Back arrow < (Left), Title "Notifications" (Center).

Tabs:

All (Active, purple text with purple bottom underline).

Unread 3 (Gray text, purple number badge).

Important (Gray text).

Notification List items:

Layout: Left icon (circular background), Middle text (Title and description), Right timestamp. Unread items have a small dot indicator.

Item 1: Cyan '+' icon. "New job JOB-250S14-0007 created by Anjali". Time: "Just now". Unread.

Item 2: Purple user icon. "Rahul updated job JOB-250S14-0006 status". Time: "10 min ago". Unread.

Item 3: Green WhatsApp icon. "Customer update sent for JOB-250S14-0005". Time: "1 hr ago". Unread.

Item 4: Gray gear icon. "Parts added in job JOB-250S14-0004". Time: "2 hr ago". Read.

Item 5: Green check mark. "Job JOB-250S14-0003 completed". Time: "3 hr ago". Read.

Bottom Action: Centered text link "Mark all as read" (Purple text).

8. TECHNICIAN DASHBOARD
App Bar: Title "Technician" (Left), Outline Bell Icon (Right).

Welcome Banner:

Solid Secondary Green card with a subtle gradient/pattern.

Text (White): "Good Morning, Rahul" (Bold, H2), "You have 5 assigned jobs" (Body text).

Right side: Circular profile avatar (Photo of the technician).

Quick Actions (Row):

Layout: 4 equally spaced icons.

Items: My Jobs (Purple), Attendance (Cyan), Notifications (Red), Inventory (Purple).

My Jobs Summary (Grid Section):

Section Title: "My Jobs Summary" (Bold).

Grid Layout: 2 columns x 2 rows.

Card Styling: White card, left-aligned title, bottom-left large number, right-aligned chevron >.

Assigned: 5

In Progress: 3

Completed: 8

Urgent: 2 (Red text)

Bottom Navigation (Technician variant):

Items: Home (Active, Green icon/text), Jobs (Gray outline), Inventory (Gray outline), More (Gray grid icon).

Center FAB: Circular, Secondary Green, White '+' icon.

9. ASSIGNED JOBS (TECHNICIAN)
App Bar: Back arrow < (Left), Title "My Assigned Jobs" (Center).

Tabs: All 5 (Active text with underline), In Progress 3, Completed 2.

Job Cards List (Technician View):

Similar to Screen 6, but filtered for the active technician.

Card 1: Red border. "JOB-250S14-0007". Urgent. Ramesh Kumar. "Laptop not turning on". Status: "In Progress" (Orange).

Card 2: Orange border. "JOB-250S14-0006". High. Sneha Patel. "Slow performance". Status: "In Progress" (Orange).

Card 3: Green border. "JOB-250S14-0003". Normal. Vikram Singh. "Motherboard issue". Status: "Assigned" (Blue).

Card 4: Green border. "JOB-250S14-0002". Normal. Arjun Mehta. "Keyboard not working". Status: "Completed" (Green).

Card 5: Orange border. "JOB-250S14-0001". High. Karan Joshi. "Display flickering". Status: "Assigned" (Blue).

10. ONSITE JOB (TECHNICIAN)
App Bar: Title "Onsite Job Visit" (Centered).

Job Context Banner:

Solid Green header card spanning full width.

Profile icon (Left), "JOB-250S14-0006" / "Sneha Patel" (White text). Right side 'X' close icon.

Start Visit Section:

Header: "Start Visit".

Instruction: "Take selfie at location" with camera icon.

Image Box: Large rectangular container showing the technician's live camera feed.

Location Data: "Location", "12.9342° N, 77.6100° E".

Button: Solid Green, "Start Visit Selfie".

Complete Visit Section:

Header: "Complete Visit".

Instruction: "Take selfie after completing/leaving" with check-circle icon.

Button: Outline Green border, Green text, "Take Completion Selfie".

Bottom Action (Sticky): Solid Green button, full width, "Update Status".

11. UPDATE WORK (TECHNICIAN)
App Bar: Back arrow < (Left), Title "Update Job" (Center).

Job Context: Top row showing Purple User Icon, "JOB-250S14-0007", "Ramesh Kumar".

Materials / Parts Used Section:

Header row: "Materials / Parts Used" (Left, bold), "+ Add Item" (Right, blue text link).

Table format. Columns: Item (Wide), Qty (Narrow), Cost (Narrow).

Row 1: RAM 8GB DDR4 | 1 | ₹2,000 (Trash can delete icon on far right)

Row 2: SSD 512GB | 1 | ₹3,200 (Trash can delete icon on far right)

Row 3: Screw Set | 1 | ₹100 (Trash can delete icon on far right)

Summary Row: "Total Cost" | "₹5,300" (Bold).

Work Notes:

Label: "Work Notes".

Text area. Value: "Diagnosed issue in power IC. Replaced RAM and SSD. System running perfectly now."

Status Update:

Label: "Status".

Dropdown selector. Value: "In Progress".

Bottom Action (Sticky): Solid Green button, full width, "Update & Notify".

12. ADMIN DASHBOARD (WEB/APP)
App Bar: Title "Admin" (Left), 3-dot menu (Right).

Welcome Banner:

Solid Tertiary Blue card with subtle gradient/pattern.

Text (White): "Welcome, Admin" (Bold, H2), "Here's your system overview" (Body text).

Right side: Shield/Settings icon inside a light blue circle.

Overview (Grid Section):

Section Title: "Overview" (Bold).

Grid Layout: 2 columns x 2 rows of pure data cards (White bg, thin border).

Total Jobs: 128 (Large bold number)

Technicians: 12 (Large bold number)

Customers: 532 (Large bold number)

Revenue (May): ₹2,45,000 (Large bold number)

Alerts Section:

Section Title: "Alerts" (Bold).

List items (Card format, thin border):

Green triangle icon. "Low stock: SSD 256GB (5 left)".

Orange circle icon. "3 leave requests pending".

Red triangle icon. "2 urgent jobs not started".

Bottom Navigation (Admin variant):

Items: Home (Active, Blue icon/text), Jobs (Gray outline), Users (Gray users icon), Reports (Gray chart icon), More.

13. INVENTORY MANAGEMENT
App Bar: Back arrow < (Left), Title "Inventory" (Center).

Search Bar: Full width input, light gray background, left magnifying glass icon, placeholder "Search items".

Tabs: All 5 (Active text with underline), Low Stock 3, Out of Stock 1.

Inventory List (Vertical Scroll):

Layout: Left icon representing item type, Middle Item Name, Right stock quantity. Thin divider line between rows.

Item 1: Microchip icon. "SSD 256GB". Stock: "5 left" (Red text, indicating low).

Item 2: RAM stick icon. "RAM 8GB DDR4". Stock: "12 left" (Black text).

Item 3: Cable/Plug icon. "Laptop Charger Dell". Stock: "8 left" (Black text).

Item 4: Keyboard icon. "Keyboard USB". Stock: "15 left" (Black text).

Item 5: Tube/Paste icon. "Thermal Paste". Stock: "18 left" (Black text).

FAB: Solid Blue circular button positioned bottom right, contains a White '+' icon.

14. REPORTS & ANALYTICS
App Bar: Back arrow < (Left), Title "Reports" (Center).

Date Filter: Centered rounded pill outline. Text: "01 May - 14 May 2025 >", trailed by a calendar icon.

Jobs Overview (Chart Section):

Section Title: "Jobs Overview".

Vertical Bar Chart. Y-Axis: 0, 50, 100. X-Axis: Jan, Feb, Mar (Implicit based on groupings).

Data Grouping: Clusters of 3 bars per x-axis unit.

Legend (Right aligned, vertically stacked): Received (Blue square), In Progress (Green square), Completed (Orange square).

Top Technicians Section:

Section Title: "Top Technicians".

Table/List Layout: Rank number (Left, blue text), Name (Bold), Jobs Count (Gray), Revenue Generated (Black, bold).

Row 1: 1 | Rahul | 32 jobs | ₹78,000

Row 2: 2 | Imran | 28 jobs | ₹62,000

Row 3: 3 | Amit  | 18 jobs | ₹38,000

Bottom Action: Centered text link "View More >" (Blue text).

15. BILL GENERATION
App Bar: Back arrow < (Left), Title "Generate Bill" (Center), Signal/Wifi/Battery icons.

Job/Customer Info Row:

Left: "JOB-250S14-0007", "Ramesh Kumar" (Subtitle).

Right: "+ Add Discount" (Blue text link).

Line Items Table:

Header row: Item (Left aligned), Qty (Center), Amount (Right aligned). Divider line below header.

Row 1: RAM 8GB DDR4 | 1 | ₹2,000

Row 2: SSD 512GB | 1 | ₹3,200

Row 3: Labor Charges | 1 | ₹800

Divider line below items.

Calculations Section (Right aligned amounts):

Sub Total: ₹6,000

Tax (18%): ₹1,080

Discount: -₹300

Divider line.

Total (Bold, larger text): ₹6,780

Bottom Actions (Sticky row):

Layout: 3 buttons side-by-side.

Button 1: "Print" (Outline border, gray text, printer icon).

Button 2: "Email" (Outline border, gray text, mail icon).

Button 3: "WhatsApp" (Solid Green background, white text, WhatsApp icon).