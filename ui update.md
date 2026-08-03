**1 ROLE SELECTION (LOGIN)**

This page serves as the entry point to the application, utilizing a clean, card-based layout to direct users to their respective portals.

* **Header Section:** Displays a bold "Welcome" message alongside the prompt "Please select your role to continue" on the left side of the screen.  
* **Role Selection Cards:** Three distinct interactive cards are stacked vertically on the right, each featuring a specific color theme, icon, title, description, and a right-pointing chevron indicating navigation.

| Role | Icon Theme | Description Text |
| :---- | :---- | :---- |
| **Receptionist** | Purple / User with Headset | Manage customers, jobs and billing |
| **Technician** | Green / User with Wrench | View assigned jobs and update status |
| **Admin** | Blue / Shield with Checkmark | Manage users, jobs, inventory and reports |

## 

**2 RECEPTIONIST DASHBOARD**

This represents the primary hub for the receptionist role, featuring a persistent left sidebar for global navigation and a main content area for quick insights and actions.

* **Global Sidebar Navigation:** Contains vertical menu items with icons. Options include Dashboard (currently active, highlighted in purple), Jobs, Customers, Attendance, Notifications, Reports, and More.  
* **Greeting Banner:** A wide, purple-gradient card at the top displaying "Good Morning, Anjali", an encouraging sub-message, and the user's circular profile picture on the right.  
* **Quick Actions:** A horizontal row of five square, interactive buttons designed for rapid task execution. Options include New Job (purple), Job List (orange), Customers (purple), Attendance (blue), and Print Receipt (red).  
* **Today's Summary:** A metrics dashboard displaying four key performance indicators in distinct cards.  
* **Floating Action Button (FAB):** A circular, solid purple button with a "+" icon located in the bottom right corner for immediate primary actions.

| Metric | Value | Visual Styling |
| :---- | :---- | :---- |
| **Jobs Received** | 12 | Standard black text |
| **In Progress** | 8 | Standard black text |
| **Completed** | 5 | Standard black text |
| **Urgent** | 2 | Value highlighted in red |

## 

**3 ATTENDANCE (RECEPTIONIST)**

This screen handles employee time-tracking and location verification using a split-pane layout.

* **Left Pane \- Current Attendance:** A module dedicated to logging today's attendance. Features a month/year dropdown (May 2025\) and a horizontal date slider highlighting the current day (Wed 14).  
* **Status & Location:** Displays a green "Today, 14 May 2025" block with a "Present" status indicator. Below this, the exact time (09:15 AM) and GPS coordinates (12.9716° N, 77.5946° E) are logged.  
* **Capture Module:** Centers a live-feed or captured photo of the employee, with a prominent green "Take Selfie for Attendance" call-to-action button underneath.  
* **Right Pane \- Attendance History:** A scrollable list of past attendance logs. Each card shows the employee's photo, date, and clock-in time. A "View All" link is positioned at the top right.  
* **Legend:** A key at the bottom explains the color-coding: P (Present, green), A (Absent, purple), L (Leave, red), and H (Half Day, orange).

## 

**4 CUSTOMER INTAKE FORM**

A structured, two-column data entry screen for logging new repair or service requests. Mandatory fields are denoted by red asterisks.

* **Left Column \- Customer & Device Data:** Contains standard text input fields for Customer Name (Ramesh Kumar) and Contact Number (9876543210, accompanied by a phone icon). It also includes a dropdown menu for Device Type (Laptop) and a text field for the Reported Issue.  
* **Right Column \- Job Details:** Starts with an optional multiline text area for Remarks.  
* **Job Type Selection:** Utilizes radio buttons to toggle between "In-house Job" (currently selected) and "Onsite Job".  
* **Priority Selection:** A segmented control allowing the user to select Normal, High, or Urgent. The "Urgent" button is currently selected and highlighted with a solid red background.  
* **Navigation:** A full-width, solid purple "Next" button anchors the bottom right of the form.

## 

**5 JOB ASSIGNMENT**

This screen serves as the final confirmation and assignment step before a job is officially logged into the system.

* **Left Column \- Assignment:** Displays an auto-generated Job ID (JOB-250S14-0007). Below this is a mandatory dropdown menu to "Select Technician" (Rahul Technician selected) and a read-only field indicating the Job Type (In-house Job).  
* **Secondary Action:** An outlined button at the bottom left with a printer icon labeled "Print Receipt".  
* **Right Column \- Summary:** A read-only summary of the intake form. Displays the Priority (Urgent tag in red), Customer name, Device type, and Reported Issue.  
* **Primary Action:** A solid purple "Create Job" button anchors the bottom right of the screen.

## 

**6 JOB TRACKING (RECEPTIONIST)**

A comprehensive data table view allowing the receptionist to monitor all active and historical jobs.

* **Header Controls:** Features Search and Filter icons on the top right for data manipulation.  
* **Navigation Tabs:** A horizontal scroll of tabs filtering table views by status: All (25), Received (6), In Progress (9), Completed (7), and Waiting (3). The active tab is underlined in purple.  
* **Data Table:** Organized by columns: Job ID, Customer, Device, Issue, Technician, Status, and Priority.  
* **Visual Indicators:** Status and Priority columns utilize colored pill badges to allow for rapid visual scanning (e.g., Urgent is red, In Progress is orange, Completed is blue).

## 

**7 NOTIFICATIONS**

A dedicated activity feed summarizing system alerts and updates.

* **Navigation Tabs:** Categorizes alerts into All, Unread (3), and Important. A bell icon sits on the far right.  
* **List Items:** Each notification row features a specific icon representing the source or type of alert, descriptive text, and a relative timestamp on the right edge.  
* **Footer:** A centered, hyperlinked text button labeled "Mark all as read" sits at the bottom of the feed.

| Icon Type | Color Theme | Notification Example |
| :---- | :---- | :---- |
| **Bell** | Blue | System alerts (e.g., New job created) |
| **User** | Purple | Staff updates (e.g., Technician updated job status) |
| **WhatsApp** | Green | Customer communications (e.g., Update sent, job completed) |
| **Image** | Blue | Inventory/Action updates (e.g., Parts added in job) |

## 

**8 TECHNICIAN DASHBOARD**

The primary hub tailored for the Technician role, emphasizing field functionality and assigned tasks over customer management.

* **Global Sidebar Navigation:** Menu items are customized for the technician: Dashboard (active), My Jobs, Attendance, Inventory, Notifications, and More.  
* **Greeting Banner:** A green-gradient header card greeting the user ("Good Morning, Rahul"), showing a summary of assigned jobs, and displaying the user profile picture.  
* **My Jobs Summary:** Four metric cards detailing workload. "Assigned", "In Progress", "Completed", and "Urgent" (highlighted with red text).  
* **Quick Actions:** A horizontal row of square buttons with relevant technician icons: My Jobs (green), Attendance (blue), Update Work (red map/pin), and Inventory (purple).

## 

**9 ASSIGNED JOBS (TECHNICIAN)**

A focused list view for technicians to manage their specific queue of work.

* **Toggle Tabs:** A pill-shaped segmented control at the top allowing the technician to switch between "All", "In Progress", and "Completed" views.  
* **Job Cards:** Each row represents a job, featuring a thick vertical colored stripe on the left edge corresponding to its status/priority.  
* **Card Data:** Details include the Job ID, Customer Name, a preview of the issue ("Laptop not turning on"), and dynamic status/priority badges aligned to the right (e.g., Urgent, In Progress).

## 

**10 ONSITE JOB (TECHNICIAN)**

A specialized control panel used by technicians while executing field service requests, heavily focused on location verification and status updates.

* **Header Banner:** A green block displaying the Job ID, Customer Name (Sneha Patel), and an orange "In Progress" status badge on the right.  
* **Start Visit Module (Left):** Prompts the user to "Take selfie at location" with a checkmark indicating completion. Displays the captured image alongside the active GPS coordinates. A green "Start Visit Selfie" button is located below.  
* **Complete Visit Module (Top Right):** Contains an unselected radio button to "Take selfie after completing/leaving" and an inactive, outlined "Take Completion Selfie" action button.  
* **Update Status Actions (Bottom Right):** A row of three square buttons for in-field reporting: Materials (purple), TA/Expenses (blue), and Update Status (grey tag).

## 

**11 UPDATE WORK (TECHNICIAN)**

This screen provides a split-pane interface for technicians to log their progress, parts used, and final notes before closing or updating a task.

* **Header Section:** Displays the active Job ID (JOB-250S14-0007), the Customer Name (Ramesh Kumar), and a dynamic status badge currently marked "In Progress" in green. A user profile icon sits to the left.  
* **Left Pane \- Materials / Parts Used:** A financial and inventory tracking module.  
  * Features a blue "+ Add Item" hyperlinked text button for appending new parts.  
  * Displays a structured table with columns for Item, Qty, and Cost (₹).  
  * Automatically tallies the "Total Cost" (₹5,300) at the bottom for instant visibility.  
* **Right Pane \- Notes & Status:**  
  * **Work Notes:** A multi-line text input area allowing the technician to explain the fix (e.g., "Diagnosed issue in power IC...").  
  * **Status Update:** A dropdown menu to change the current lifecycle stage of the job.  
  * **Primary Action:** A full-width, solid green "Update & Notify" button, indicating that saving these changes will trigger an automated alert (likely to the receptionist or customer).

## 

**12 ADMIN DASHBOARD (WEB)**

This screen acts as the high-level operational and financial command center for management, utilizing a wider desktop-style layout with a dark-themed sidebar.

* **Global Sidebar Navigation (Dark Mode):** Features a comprehensive list of administrative controls: Dashboard (active), Users, Jobs (with a dropdown chevron), Inventory, Reports (with chevron), Attendance, Money Mgmt, and Settings (with chevron).  
* **Greeting Banner:** A vibrant blue card welcoming the "Admin" with a brief system overview message and a decorative bar chart icon.  
* **Key Performance Indicators (KPIs):** Four prominent white cards display critical top-line metrics: Total Jobs (128), Technicians (12), Customers (532), and Revenue for May (₹2,45,000).  
* **Alerts Module (Bottom Left):** A prioritized feed of system warnings requiring management attention. Utilizes color-coded icons for severity: Green (Low stock), Orange (Leave requests), and Red (Urgent jobs not started).  
* **Today's Jobs Overview (Bottom Right):** A visual breakdown of daily operations using a colorful donut chart. The center displays the total (25), flanked by a legend categorized into Received (blue), In Progress (green), Completed (orange), and Waiting (yellow/red).

## 

**13 INVENTORY MANAGEMENT**

A straightforward, searchable database view for tracking parts, consumables, and hardware stock.

* **Header Controls:** Features a prominent "Search items" bar on the left. On the right, quick-filter text summaries highlight critical issues: "Low Stock: 3" and "Out of Stock: 1".  
* **Data Table:** Organized logically with distinct visual icons for each item type. Columns include Item, Category, Stock (quantity), and Status.

| Item Example | Category | Status Indicator | Visual Styling |
| :---- | :---- | :---- | :---- |
| **SSD 256GB** | Storage | Low Stock | Red pill background with red text |
| **RAM 8GB DDR4** | Memory | In Stock | Green pill background with green text |

*   
  **Floating Action Button (FAB):** A blue circular button with a "+" icon located in the bottom right corner, designated for adding new inventory items to the system.

## 

**14 REPORTS & ANALYTICS**

A dedicated analytics screen designed for visual data consumption and performance tracking.

* **Top Controls:** A centralized date-range picker dropdown ("01 May \- 14 May 2025") controls the data scope. An "Export" button is positioned on the top right for generating external reports.  
* **Jobs Overview (Left):** A grouped bar chart visualizing job volume over specific dates. The y-axis measures volume (0-90), and the x-axis plots dates. A legend on the right clarifies the color coding: Blue (Received), Green (In Progress), and Orange (Completed).  
* **Top Technicians (Right):** A ranked leaderboard tracking employee output and generated revenue.  
  * Lists technicians by rank (1, 2, 3\) alongside their name, total jobs completed, and total revenue generated (e.g., Rahul: 32 jobs, ₹78,000).  
  * Includes a "View More \>" link at the bottom to expand the list.

