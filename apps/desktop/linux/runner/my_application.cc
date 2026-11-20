#include "my_application.h"

#include <flutter_linux/flutter_linux.h>
#ifdef GDK_WINDOWING_X11
#include <gdk/gdkx.h>
#endif

#include "flutter/generated_plugin_registrant.h"

struct _MyApplication {
  GtkApplication parent_instance;
  char** dart_entrypoint_arguments;
};

G_DEFINE_TYPE(MyApplication, my_application, GTK_TYPE_APPLICATION)

// ---- Window state (size, position, maximised) persisted between sessions ----
// Stored in $XDG_CONFIG_HOME/astro_sushil_desktop/window.ini. Positions are ignored by
// Wayland compositors (clients cannot place windows); size and maximised state still apply.
typedef struct {
  gint x, y, width, height;
  gboolean maximized, has_position;
} WindowState;

static WindowState g_window_state = {0, 0, 1440, 900, FALSE, FALSE};

static gchar* window_state_path() {
  return g_build_filename(g_get_user_config_dir(), "astro_sushil_desktop", "window.ini", nullptr);
}

static void load_window_state() {
  g_autofree gchar* path = window_state_path();
  g_autoptr(GKeyFile) kf = g_key_file_new();
  if (!g_key_file_load_from_file(kf, path, G_KEY_FILE_NONE, nullptr)) return;
  g_autoptr(GError) e = nullptr;
  gint w = g_key_file_get_integer(kf, "window", "width", &e);
  if (e == nullptr && w >= 800 && w <= 10000) g_window_state.width = w;
  g_clear_error(&e);
  gint h = g_key_file_get_integer(kf, "window", "height", &e);
  if (e == nullptr && h >= 560 && h <= 10000) g_window_state.height = h;
  g_clear_error(&e);
  gint x = g_key_file_get_integer(kf, "window", "x", &e);
  gboolean has_x = e == nullptr;
  g_clear_error(&e);
  gint y = g_key_file_get_integer(kf, "window", "y", &e);
  if (has_x && e == nullptr) {
    g_window_state.x = x;
    g_window_state.y = y;
    g_window_state.has_position = TRUE;
  }
  g_clear_error(&e);
  g_window_state.maximized = g_key_file_get_boolean(kf, "window", "maximized", nullptr);
}

static void save_window_state() {
  g_autofree gchar* path = window_state_path();
  g_autofree gchar* dir = g_path_get_dirname(path);
  g_mkdir_with_parents(dir, 0700);
  g_autoptr(GKeyFile) kf = g_key_file_new();
  g_key_file_set_integer(kf, "window", "width", g_window_state.width);
  g_key_file_set_integer(kf, "window", "height", g_window_state.height);
  if (g_window_state.has_position) {
    g_key_file_set_integer(kf, "window", "x", g_window_state.x);
    g_key_file_set_integer(kf, "window", "y", g_window_state.y);
  }
  g_key_file_set_boolean(kf, "window", "maximized", g_window_state.maximized);
  g_key_file_save_to_file(kf, path, nullptr);
}

static gboolean on_window_configure(GtkWidget* widget, GdkEventConfigure* event, gpointer) {
  if (!g_window_state.maximized) {
    gint w, h, x, y;
    gtk_window_get_size(GTK_WINDOW(widget), &w, &h);
    gtk_window_get_position(GTK_WINDOW(widget), &x, &y);
    g_window_state.width = w;
    g_window_state.height = h;
    g_window_state.x = x;
    g_window_state.y = y;
    g_window_state.has_position = TRUE;
  }
  return FALSE;
}

static gboolean on_window_state(GtkWidget*, GdkEventWindowState* event, gpointer) {
  g_window_state.maximized = (event->new_window_state & GDK_WINDOW_STATE_MAXIMIZED) != 0;
  return FALSE;
}

static void on_window_destroy(GtkWidget*, gpointer) { save_window_state(); }

// Called when first Flutter frame received.
static void first_frame_cb(MyApplication* self, FlView* view) {
  gtk_widget_show(gtk_widget_get_toplevel(GTK_WIDGET(view)));
}

// Implements GApplication::activate.
static void my_application_activate(GApplication* application) {
  MyApplication* self = MY_APPLICATION(application);
  GtkWindow* window =
      GTK_WINDOW(gtk_application_window_new(GTK_APPLICATION(application)));

  // Use a header bar when running in GNOME as this is the common style used
  // by applications and is the setup most users will be using (e.g. Ubuntu
  // desktop).
  // If running on X and not using GNOME then just use a traditional title bar
  // in case the window manager does more exotic layout, e.g. tiling.
  // If running on Wayland assume the header bar will work (may need changing
  // if future cases occur).
  gboolean use_header_bar = TRUE;
#ifdef GDK_WINDOWING_X11
  GdkScreen* screen = gtk_window_get_screen(window);
  if (GDK_IS_X11_SCREEN(screen)) {
    const gchar* wm_name = gdk_x11_screen_get_window_manager_name(screen);
    if (g_strcmp0(wm_name, "GNOME Shell") != 0) {
      use_header_bar = FALSE;
    }
  }
#endif
  if (use_header_bar) {
    GtkHeaderBar* header_bar = GTK_HEADER_BAR(gtk_header_bar_new());
    gtk_widget_show(GTK_WIDGET(header_bar));
    gtk_header_bar_set_title(header_bar, "Astro Sushil Desktop");
    gtk_header_bar_set_show_close_button(header_bar, TRUE);
    gtk_window_set_titlebar(window, GTK_WIDGET(header_bar));
  } else {
    gtk_window_set_title(window, "Astro Sushil Desktop");
  }

  load_window_state();
  gtk_window_set_default_size(window, g_window_state.width, g_window_state.height);
  gtk_widget_set_size_request(GTK_WIDGET(window), 1024, 640);
  if (g_window_state.has_position) gtk_window_move(window, g_window_state.x, g_window_state.y);
  if (g_window_state.maximized) gtk_window_maximize(window);
  g_signal_connect(window, "configure-event", G_CALLBACK(on_window_configure), nullptr);
  g_signal_connect(window, "window-state-event", G_CALLBACK(on_window_state), nullptr);
  g_signal_connect(window, "destroy", G_CALLBACK(on_window_destroy), nullptr);

  g_autoptr(FlDartProject) project = fl_dart_project_new();
  fl_dart_project_set_dart_entrypoint_arguments(
      project, self->dart_entrypoint_arguments);

  FlView* view = fl_view_new(project);
  GdkRGBA background_color;
  // Background defaults to black, override it here if necessary, e.g. #00000000
  // for transparent.
  gdk_rgba_parse(&background_color, "#FAF7F2");  // brand canvas, avoids a black flash
  fl_view_set_background_color(view, &background_color);
  gtk_widget_show(GTK_WIDGET(view));
  gtk_container_add(GTK_CONTAINER(window), GTK_WIDGET(view));

  // Show the window when Flutter renders.
  // Requires the view to be realized so we can start rendering.
  g_signal_connect_swapped(view, "first-frame", G_CALLBACK(first_frame_cb),
                           self);
  gtk_widget_realize(GTK_WIDGET(view));

  fl_register_plugins(FL_PLUGIN_REGISTRY(view));

  gtk_widget_grab_focus(GTK_WIDGET(view));
}

// Implements GApplication::local_command_line.
static gboolean my_application_local_command_line(GApplication* application,
                                                  gchar*** arguments,
                                                  int* exit_status) {
  MyApplication* self = MY_APPLICATION(application);
  // Strip out the first argument as it is the binary name.
  self->dart_entrypoint_arguments = g_strdupv(*arguments + 1);

  g_autoptr(GError) error = nullptr;
  if (!g_application_register(application, nullptr, &error)) {
    g_warning("Failed to register: %s", error->message);
    *exit_status = 1;
    return TRUE;
  }

  g_application_activate(application);
  *exit_status = 0;

  return TRUE;
}

// Implements GApplication::startup.
static void my_application_startup(GApplication* application) {
  // MyApplication* self = MY_APPLICATION(object);

  // Perform any actions required at application startup.

  G_APPLICATION_CLASS(my_application_parent_class)->startup(application);
}

// Implements GApplication::shutdown.
static void my_application_shutdown(GApplication* application) {
  // MyApplication* self = MY_APPLICATION(object);

  // Perform any actions required at application shutdown.

  G_APPLICATION_CLASS(my_application_parent_class)->shutdown(application);
}

// Implements GObject::dispose.
static void my_application_dispose(GObject* object) {
  MyApplication* self = MY_APPLICATION(object);
  g_clear_pointer(&self->dart_entrypoint_arguments, g_strfreev);
  G_OBJECT_CLASS(my_application_parent_class)->dispose(object);
}

static void my_application_class_init(MyApplicationClass* klass) {
  G_APPLICATION_CLASS(klass)->activate = my_application_activate;
  G_APPLICATION_CLASS(klass)->local_command_line =
      my_application_local_command_line;
  G_APPLICATION_CLASS(klass)->startup = my_application_startup;
  G_APPLICATION_CLASS(klass)->shutdown = my_application_shutdown;
  G_OBJECT_CLASS(klass)->dispose = my_application_dispose;
}

static void my_application_init(MyApplication* self) {}

MyApplication* my_application_new() {
  // Set the program name to the application ID, which helps various systems
  // like GTK and desktop environments map this running application to its
  // corresponding .desktop file. This ensures better integration by allowing
  // the application to be recognized beyond its binary name.
  g_set_prgname(APPLICATION_ID);

  return MY_APPLICATION(g_object_new(my_application_get_type(),
                                     "application-id", APPLICATION_ID, "flags",
                                     G_APPLICATION_NON_UNIQUE, nullptr));
}
